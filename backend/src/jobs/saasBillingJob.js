const db = require('../../db');

async function processarFaturamentoSaas() {
    try {
        console.log('[SaaS Billing Job] Iniciando verificação de faturamento e régua de cobrança...');

        const now = new Date();
        const anoAtual = now.getFullYear();
        const mesAtual = now.getMonth(); // 0-11

        // 1. Atualizar faturas pendentes vencidas para 'vencido' e marcar empresas como 'inadimplente'
        const [vencidas] = await db.query(`
          SELECT f.id, f.empresa_id, f.data_vencimento, e.nome AS empresa_nome, e.status_financeiro
          FROM saas_faturas f
          JOIN empresas e ON e.id = f.empresa_id
          WHERE f.status = 'pendente' AND f.data_vencimento < CURDATE()
        `);

        for (const fat of vencidas) {
            await db.execute("UPDATE saas_faturas SET status = 'vencido' WHERE id = ?", [fat.id]);
            if (fat.status_financeiro !== 'suspenso' && fat.status_financeiro !== 'liberado_confianca') {
                await db.execute("UPDATE empresas SET status_financeiro = 'inadimplente' WHERE id = ?", [fat.empresa_id]);
                console.log(`[SaaS Billing Job] Empresa ${fat.empresa_nome} (ID ${fat.empresa_id}) marcada como INADIMPLENTE.`);
            }
        }

        // 2. Suspensão automática de empresas inadimplentes há mais de 7 dias (respeitando liberação de confiança e pagamentos dos últimos 30 dias)
        const [paraSuspender] = await db.query(`
          SELECT DISTINCT e.id, e.nome, e.email, e.status_financeiro, e.liberacao_confianca_ate
          FROM empresas e
          JOIN saas_faturas f ON f.empresa_id = e.id
          WHERE f.status = 'vencido'
            AND f.data_vencimento <= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND e.status_financeiro != 'suspenso'
            AND e.slug != 'default'
            AND NOT EXISTS (
              SELECT 1 FROM saas_faturas f2 
              WHERE f2.empresa_id = e.id 
                AND f2.status = 'pago' 
                AND f2.pago_em >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            )
        `);

        for (const emp of paraSuspender) {
            // Se está liberado por confiança e a data ainda é válida no futuro, não suspende!
            if (emp.status_financeiro === 'liberado_confianca' && emp.liberacao_confianca_ate && new Date(emp.liberacao_confianca_ate) >= new Date()) {
                continue;
            }
            await db.execute("UPDATE empresas SET status_financeiro = 'suspenso' WHERE id = ?", [emp.id]);
            console.log(`[SaaS Billing Job] 🚨 EMPRESA SUSPENSA AUTOMATICAMENTE: ${emp.nome} (ID ${emp.id}) por inadimplência > 7 dias.`);
        }

        // 3. Buscar empresas ativas para gerar faturas do mês (Fixo, Porcentagem ou Híbrido)
        const [empresas] = await db.query(`
          SELECT e.id, e.nome, e.saas_plano_id, e.valor_mensal, e.comissao_porcentagem, e.dia_vencimento, e.tipo_cobranca, e.slug,
                 e.email, e.cnpj, e.card_token, e.card_brand, e.card_last4, e.debito_automatico_ativo
          FROM empresas e
          WHERE e.ativo = 1 AND (e.valor_mensal > 0 OR e.tipo_cobranca IN ('fixo', 'porcentagem', 'hibrido'))
        `);

        for (const emp of empresas) {
            if (emp.slug === 'default') continue; // Ignorar empresa padrão se não for cobrada

            const dia = Math.min(Math.max(emp.dia_vencimento || 10, 1), 28);
            let dataVenc = new Date(anoAtual, mesAtual, dia);
            
            // SE o dia de corte do mês atual já passou, o vencimento gerado DEVE ser para o PRÓXIMO mês (nunca retroativo)!
            const hojeData = new Date();
            hojeData.setHours(0, 0, 0, 0);
            if (dataVenc <= hojeData) {
                dataVenc = new Date(anoAtual, mesAtual + 1, dia);
            }
            const vencStr = dataVenc.toISOString().split('T')[0];

            // Proteção Global: Não gerar nova fatura se a empresa já pagou nos últimos 25 dias ou já possui fatura válida para o período
            const [[faturaAtiva]] = await db.query(`
              SELECT id FROM saas_faturas 
              WHERE empresa_id = ? 
                AND status IN ('pago', 'pendente')
                AND (
                  (pago_em IS NOT NULL AND pago_em >= DATE_SUB(CURDATE(), INTERVAL 25 DAY))
                  OR data_vencimento >= CURDATE()
                )
              LIMIT 1
            `, [emp.id]);

            if (faturaAtiva) {
                // Empresa já possui cobertura ativa ou fatura futura agendada
                continue;
            }

            // Verificar se já existe fatura gerada com esta mesma data de vencimento
            const [[existente]] = await db.query(`
              SELECT id FROM saas_faturas 
              WHERE empresa_id = ? AND data_vencimento = ? AND status != 'cancelado'
            `, [emp.id, vencStr]);

            if (!existente) {
                const mesNome = dataVenc.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                
                // Calcular total de vendas aprovadas no período (últimos 30 dias)
                const [[vendasRow]] = await db.query(`
                    SELECT IFNULL(SUM(valor), 0) AS total_vendas
                    FROM pagamentos
                    WHERE empresa_id = ? AND status IN ('approved', 'pago')
                      AND criado_em >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                `, [emp.id]);

                const totalVendas = parseFloat(vendasRow?.total_vendas || 0);
                const valorBase = (emp.tipo_cobranca === 'porcentagem') ? 0 : parseFloat(emp.valor_mensal || 0);
                const comissaoPct = (emp.tipo_cobranca === 'fixo') ? 0 : parseFloat(emp.comissao_porcentagem || 0);
                const valorComissao = (totalVendas * comissaoPct) / 100;
                const valorTotal = valorBase + valorComissao;

                if (valorTotal <= 0) continue;

                let desc = `Mensalidade SaaS Hotspot - ${mesNome}`;
                if (emp.tipo_cobranca === 'porcentagem') {
                    desc = `SaaS Revenue Share - ${mesNome} (Comissão ${comissaoPct}% s/ R$ ${totalVendas.toFixed(2)} em vendas)`;
                } else if (emp.tipo_cobranca === 'hibrido' && valorComissao > 0) {
                    desc = `Mensalidade SaaS + Comissão - ${mesNome} (Fixo: R$ ${valorBase.toFixed(2)} + ${comissaoPct}% s/ R$ ${totalVendas.toFixed(2)} = R$ ${valorComissao.toFixed(2)})`;
                }

                const [insertRes] = await db.execute(`
                  INSERT INTO saas_faturas 
                    (empresa_id, saas_plano_id, descricao, valor, valor_base, total_vendas, comissao_porcentagem, valor_comissao, data_vencimento, status, forma_pagamento)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', 'pix')
                `, [
                    emp.id,
                    emp.saas_plano_id || null,
                    desc,
                    valorTotal,
                    valorBase,
                    totalVendas,
                    comissaoPct,
                    valorComissao,
                    vencStr
                ]);

                const novaFaturaId = insertRes.insertId;
                console.log(`[SaaS Billing Job] Fatura gerada para ${emp.nome} (Total: R$ ${valorTotal.toFixed(2)} | Base: R$ ${valorBase.toFixed(2)} | Comissão: R$ ${valorComissao.toFixed(2)}) Vencimento: ${vencStr}`);

                // Se a empresa tiver cartão de crédito cadastrado e débito automático ativo
                if (emp.debito_automatico_ativo === 1 && emp.card_token) {
                    try {
                        const { cobrarCartaoFaturaSaas } = require('../services/saasCartaoService');
                        const resCartao = await cobrarCartaoFaturaSaas(
                            { id: novaFaturaId, valor: valorTotal, descricao: desc, empresa_id: emp.id },
                            emp.card_token,
                            emp
                        );

                        if (resCartao.success) {
                            await db.execute(
                                `UPDATE saas_faturas 
                                 SET status = 'pago', pago_em = NOW(), forma_pagamento = 'cartao',
                                     cartao_transacao_id = ?, cartao_mensagem_erro = NULL
                                 WHERE id = ?`,
                                [resCartao.transacaoId, novaFaturaId]
                            );
                            await db.execute("UPDATE empresas SET status_financeiro = 'adimplente' WHERE id = ?", [emp.id]);
                            console.log(`[SaaS Billing Job] 💳 DÉBITO AUTOMÁTICO APROVADO para ${emp.nome} (Fatura #${novaFaturaId}, Transação: ${resCartao.transacaoId})`);
                        } else {
                            await db.execute(
                                `UPDATE saas_faturas 
                                 SET cartao_mensagem_erro = ?, tentativas_cobranca = tentativas_cobranca + 1
                                 WHERE id = ?`,
                                [resCartao.mensagem, novaFaturaId]
                            );
                            console.warn(`[SaaS Billing Job] ⚠️ Débito automático recusado para ${emp.nome}: ${resCartao.mensagem}`);
                        }
                    } catch (cardErr) {
                        console.error(`[SaaS Billing Job] Erro ao tentar débito automático para ${emp.nome}:`, cardErr.message);
                    }
                }
            }
        }

        // 4. Executar disparos automáticos de WhatsApp PIX (3 dias antes e no dia do Vencimento)
        const { processarDisparosWhatsappSaas } = require('../controllers/saasFaturaController');
        if (typeof processarDisparosWhatsappSaas === 'function') {
            await processarDisparosWhatsappSaas();
        }

        // 5. Executar alertas de expiração do Trial (2 dias antes, dia final e suspensão pós-trial)
        await processarAlertasTrialSaas();

        console.log('[SaaS Billing Job] Verificação de faturamento, comissões, trial e disparos de WhatsApp concluída com sucesso.');
    } catch (err) {
        console.error('[SaaS Billing Job] Erro ao processar faturamento:', err);
    }
}

async function processarAlertasTrialSaas() {
    try {
        const { enviarMensagemDireta } = require('../controllers/whatsappController');

        // 1. Alerta de 2 dias antes do fim do trial
        const [trials2d] = await db.query(`
            SELECT id, nome, slug, email, telefone, trial_ate
            FROM empresas
            WHERE status_financeiro = 'trial'
              AND telefone IS NOT NULL AND telefone != ''
              AND trial_ate IS NOT NULL
              AND DATE(trial_ate) = DATE_ADD(CURDATE(), INTERVAL 2 DAY)
              AND notificado_trial_2d_em IS NULL
              AND slug != 'default'
        `);

        for (const emp of trials2d) {
            const msg = `⏳ *Lembrete de Degustação - Nuvy Pro*\n\nOlá *${emp.nome}*, restam apenas *2 dias* do seu período de teste grátis!\n\nEsperamos que você esteja aproveitando os recursos de Captive Portal, Login Social e Automações.\n\nPara garantir que seus clientes continuem navegando sem interrupções, escolha seu plano definitivo no painel:\n👉 https://hotspot.nuvycore.online/admin/${emp.slug}/minhas-faturas`;
            
            await enviarMensagemDireta(emp.telefone, msg, 1).catch(e => console.warn('[Trial Alert 2d]', e.message));
            await db.execute("UPDATE empresas SET notificado_trial_2d_em = NOW() WHERE id = ?", [emp.id]);
            console.log(`[SaaS Trial Job] Alerta de 2 dias de trial enviado para ${emp.nome}`);
        }

        // 2. Alerta do ÚLTIMO DIA de trial (hoje)
        const [trialsHoje] = await db.query(`
            SELECT id, nome, slug, email, telefone, trial_ate
            FROM empresas
            WHERE status_financeiro = 'trial'
              AND telefone IS NOT NULL AND telefone != ''
              AND trial_ate IS NOT NULL
              AND DATE(trial_ate) = CURDATE()
              AND notificado_trial_fim_em IS NULL
              AND slug != 'default'
        `);

        for (const emp of trialsHoje) {
            const msg = `⚠️ *Seu teste grátis encerra hoje! - Nuvy Pro*\n\nOlá *${emp.nome}*, hoje é o último dia do seu teste de 7 dias.\n\nPara não pausar seus portais de acesso e manter seu Wi-Fi funcionando, ative sua assinatura via PIX:\n👉 https://hotspot.nuvycore.online/admin/${emp.slug}/minhas-faturas`;
            
            await enviarMensagemDireta(emp.telefone, msg, 1).catch(e => console.warn('[Trial Alert Fim]', e.message));
            await db.execute("UPDATE empresas SET notificado_trial_fim_em = NOW() WHERE id = ?", [emp.id]);
            console.log(`[SaaS Trial Job] Alerta de último dia de trial enviado para ${emp.nome}`);
        }

        // 3. Suspensão automática de Trials vencidos (após 7 dias)
        const [trialsExpirados] = await db.query(`
            SELECT id, nome, slug, email, telefone
            FROM empresas
            WHERE status_financeiro = 'trial'
              AND trial_ate IS NOT NULL
              AND DATE(trial_ate) < CURDATE()
              AND slug != 'default'
        `);

        for (const emp of trialsExpirados) {
            await db.execute("UPDATE empresas SET status_financeiro = 'suspenso' WHERE id = ?", [emp.id]);
            console.log(`[SaaS Trial Job] 🚨 TRIAL SUSPENSO: Empresa ${emp.nome} (ID ${emp.id}) atingiu o limite de 7 dias.`);

            if (emp.telefone) {
                const msg = `🔒 *Período de Teste Finalizado - Nuvy Pro*\n\nOlá *${emp.nome}*, seu período de teste gratuito de 7 dias chegou ao fim e o acesso foi pausado.\n\nPara reativar sua conta imediatamente, acesse:\n👉 https://hotspot.nuvycore.online/admin/${emp.slug}/minhas-faturas`;
                await enviarMensagemDireta(emp.telefone, msg, 1).catch(e => console.warn('[Trial Suspenso Msg]', e.message));
            }
        }
    } catch (err) {
        console.error('[SaaS Trial Job] Erro ao processar alertas de trial:', err);
    }
}

module.exports = { processarFaturamentoSaas, processarAlertasTrialSaas };
