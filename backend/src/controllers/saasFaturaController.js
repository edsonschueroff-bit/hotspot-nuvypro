const db = require("../../db");
const whatsappController = require("./whatsappController");
const { gerarPixFaturaSaas } = require("../services/saasPixService");

// Helper para garantir que a fatura tenha PIX gerado
async function garantirPixFatura(fatura) {
    if (fatura.pix_copia_cola) {
        return { pix_copia_cola: fatura.pix_copia_cola, pix_qr_code: fatura.pix_qr_code };
    }
    try {
        const pixRes = await gerarPixFaturaSaas(fatura);
        return pixRes;
    } catch (e) {
        console.warn(`[PIX SaaS] Aviso ao gerar PIX para fatura #${fatura.id}:`, e.message);
        return { pix_copia_cola: null, pix_qr_code: null };
    }
}

// Envia mensagem via WhatsApp com PIX Copia-e-Cola e atualiza carimbos de data/hora
async function dispararNotificacaoWhatsappFatura(fatura, tipoEtapa = 'manual') {
    const telefoneBruto = fatura.empresa_telefone || "";
    const digits = telefoneBruto.replace(/\D/g, "");
    if (!digits || digits.length < 10) {
        return { ok: false, erro: "Telefone do responsável não cadastrado ou inválido" };
    }

    const telefoneFormatado = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
    const pixInfo = await garantirPixFatura(fatura);
    const vencimentoFmt = new Date(fatura.data_vencimento).toLocaleDateString('pt-BR');
    const valorFmt = parseFloat(fatura.valor).toFixed(2).replace('.', ',');

    let sufixoVencimento = `Vencimento: ${vencimentoFmt}`;
    if (tipoEtapa === '3d') {
        sufixoVencimento = `⏰ *Vence em 3 dias!* (Vencimento: ${vencimentoFmt})`;
    } else if (tipoEtapa === 'vencimento') {
        sufixoVencimento = `🚨 *Vence HOJE!* (Vencimento: ${vencimentoFmt})`;
    }

    let mensagem = `Olá *${fatura.empresa_nome}*! 👋\n\n`;
    mensagem += `🔔 *Lembrete da fatura do seu sistema Hotspot Wi-Fi*\n\n`;
    mensagem += `📋 *Descrição:* ${fatura.descricao}\n`;
    mensagem += `💵 *Valor:* R$ ${valorFmt}\n`;
    mensagem += `📅 *Status:* ${sufixoVencimento}\n\n`;

    if (pixInfo.pix_copia_cola) {
        mensagem += `⚡ *Chave PIX Copia e Cola:*\n${pixInfo.pix_copia_cola}\n\n`;
        mensagem += `📲 *Como Pagar:*\n1. Copie a chave PIX acima.\n2. Abra o aplicativo do seu banco e escolha "PIX Copia e Cola".\n3. Cole o código e confirme.\n\nO seu acesso será liberado automaticamente após o pagamento!`;
    } else {
        mensagem += `Para efetuar o pagamento ou tirar dúvidas, acesse o portal de faturas no seu painel ou fale com nosso suporte.`;
    }

    let enviado = false;
    let erroEnvio = null;

    try {
        await whatsappController.enviarMensagemDireta(telefoneFormatado, mensagem, 1);
        enviado = true;
    } catch (wErr) {
        erroEnvio = wErr.message;
        console.warn(`[WhatsApp SaaS] Aviso ao enviar para ${telefoneFormatado}:`, wErr.message);
    }

    if (tipoEtapa === '3d') {
        await db.execute(
            "UPDATE saas_faturas SET notificado_3d_em = NOW(), whatsapp_notificado_em = NOW() WHERE id = ?",
            [fatura.id]
        );
    } else if (tipoEtapa === 'vencimento') {
        await db.execute(
            "UPDATE saas_faturas SET notificado_vencimento_em = NOW(), whatsapp_notificado_em = NOW() WHERE id = ?",
            [fatura.id]
        );
    } else {
        await db.execute(
            "UPDATE saas_faturas SET whatsapp_notificado_em = NOW() WHERE id = ?",
            [fatura.id]
        );
    }

    const waLink = `https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`;

    return {
        ok: enviado,
        mensagem_texto: mensagem,
        whatsapp_link: waLink,
        erro: erroEnvio
    };
}

// Varredura automática diária para disparos de 3d e dia do vencimento
async function processarDisparosWhatsappSaas() {
    console.log('[SaaS WhatsApp Job] Verificando faturas pendentes para lembretes de PIX...');
    let disparos3d = 0;
    let disparosHoje = 0;

    try {
        // 1. Faturas a 3 dias do vencimento
        const [faturas3d] = await db.query(`
            SELECT f.*, e.nome AS empresa_nome, e.telefone AS empresa_telefone, e.email AS empresa_email
            FROM saas_faturas f
            JOIN empresas e ON e.id = f.empresa_id
            WHERE f.status = 'pendente'
              AND f.data_vencimento = DATE_ADD(CURDATE(), INTERVAL 3 DAY)
              AND f.notificado_3d_em IS NULL
              AND e.slug != 'default'
        `);

        for (const fat of faturas3d) {
            console.log(`[SaaS WhatsApp Job] Disparando lembrete (3 dias antes) para ${fat.empresa_nome} (Fatura #${fat.id})`);
            await dispararNotificacaoWhatsappFatura(fat, '3d');
            disparos3d++;
        }

        // 2. Faturas vencendo HOJE
        const [faturasHoje] = await db.query(`
            SELECT f.*, e.nome AS empresa_nome, e.telefone AS empresa_telefone, e.email AS empresa_email
            FROM saas_faturas f
            JOIN empresas e ON e.id = f.empresa_id
            WHERE f.status = 'pendente'
              AND f.data_vencimento = CURDATE()
              AND f.notificado_vencimento_em IS NULL
              AND e.slug != 'default'
        `);

        for (const fat of faturasHoje) {
            console.log(`[SaaS WhatsApp Job] Disparando lembrete (Vencimento HOJE) para ${fat.empresa_nome} (Fatura #${fat.id})`);
            await dispararNotificacaoWhatsappFatura(fat, 'vencimento');
            disparosHoje++;
        }

        console.log(`[SaaS WhatsApp Job] Processamento concluído. (3 Dias: ${disparos3d} | Hoje: ${disparosHoje})`);
        return { disparos3d, disparosHoje };
    } catch (err) {
        console.error('[SaaS WhatsApp Job] Erro ao processar disparos:', err);
        return { error: err.message };
    }
}

// ── GET FATURAS SAAS (SUPER ADMIN) ──
exports.getFaturas = async (req, res) => {
    try {
        const { status, empresa_id } = req.query;
        let query = `
      SELECT f.*,
        e.nome AS empresa_nome,
        e.email AS empresa_email,
        e.telefone AS empresa_telefone,
        e.slug AS empresa_slug,
        e.tipo_cobranca AS empresa_tipo_cobranca,
        p.nome AS plano_nome
      FROM saas_faturas f
      JOIN empresas e ON e.id = f.empresa_id
      LEFT JOIN saas_planos p ON p.id = f.saas_plano_id
      WHERE 1=1
    `;
        const params = [];

        if (status) {
            query += " AND f.status = ?";
            params.push(status);
        }

        if (empresa_id) {
            query += " AND f.empresa_id = ?";
            params.push(empresa_id);
        }

        query += " ORDER BY f.data_vencimento DESC, f.id DESC";

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("Erro ao listar faturas SaaS:", err);
        res.status(500).json({ message: "Erro ao carregar faturas" });
    }
};

// ── OBTER MINHAS FATURAS (TENANT) ──
exports.getMinhasFaturas = async (req, res) => {
    try {
        const empresa_id = req.empresa_id;
        if (!empresa_id) {
            return res.status(400).json({ message: "Empresa não identificada" });
        }

        const [rows] = await db.query(`
            SELECT f.*, p.nome AS plano_nome
            FROM saas_faturas f
            LEFT JOIN saas_planos p ON p.id = f.saas_plano_id
            WHERE f.empresa_id = ?
            ORDER BY f.data_vencimento DESC, f.id DESC
        `, [empresa_id]);

        const [[empresa]] = await db.query(`
            SELECT e.id, e.nome, e.slug, e.status_financeiro, e.dia_vencimento, e.tipo_cobranca, e.valor_mensal,
                   e.comissao_porcentagem, e.saas_plano_id, e.trial_ate,
                   DATEDIFF(e.trial_ate, NOW()) AS dias_trial_restantes,
                   p.nome AS plano_atual_nome, p.limite_mikrotiks, p.limite_portais
            FROM empresas e
            LEFT JOIN saas_planos p ON p.id = e.saas_plano_id
            WHERE e.id = ?
        `, [empresa_id]);

        res.json({
            faturas: rows,
            empresa: empresa || null,
            status_financeiro: empresa?.status_financeiro || 'adimplente',
            dia_vencimento: empresa?.dia_vencimento,
            tipo_cobranca: empresa?.tipo_cobranca || 'fixo',
            valor_mensal: empresa?.valor_mensal || 0,
            comissao_porcentagem: empresa?.comissao_porcentagem || 0,
            saas_plano_id: empresa?.saas_plano_id || null,
            trial_ate: empresa?.trial_ate || null,
            dias_trial_restantes: empresa?.dias_trial_restantes !== undefined ? empresa.dias_trial_restantes : null,
            plano_atual_nome: empresa?.plano_atual_nome || null
        });
    } catch (err) {
        console.error("Erro ao carregar minhas faturas SaaS:", err);
        res.status(500).json({ message: "Erro ao carregar faturas" });
    }
};

// ── ASSINAR OU TROCAR DE PLANO SAAS (TENANT) ──
exports.assinarPlano = async (req, res) => {
    try {
        const empresa_id = req.empresa_id;
        const { plano_id } = req.body;

        if (!empresa_id) {
            return res.status(400).json({ message: "Empresa não identificada" });
        }
        if (!plano_id) {
            return res.status(400).json({ message: "Plano não informado" });
        }

        const [[plano]] = await db.query(
            "SELECT * FROM saas_planos WHERE id = ? AND ativo = 1",
            [plano_id]
        );

        if (!plano) {
            return res.status(404).json({ message: "Plano não encontrado ou inativo" });
        }

        const [[empresa]] = await db.query(
            "SELECT * FROM empresas WHERE id = ?",
            [empresa_id]
        );

        if (!empresa) {
            return res.status(404).json({ message: "Empresa não encontrada" });
        }

        const novoTipoCobranca = plano.tipo_cobranca || 'fixo';
        const novoValorMensal = parseFloat(plano.valor_mensal) || 0;
        const novaComissao = parseFloat(plano.comissao_porcentagem) || 0;

        // 1. Atualizar vínculo da empresa com o plano
        await db.execute(`
            UPDATE empresas 
            SET saas_plano_id = ?,
                tipo_cobranca = ?,
                valor_mensal = ?,
                comissao_porcentagem = ?
            WHERE id = ?
        `, [plano.id, novoTipoCobranca, novoValorMensal, novaComissao, empresa_id]);

        // Se for plano 100% comissão (Revenue Share R$ 0 fixo)
        if (novoTipoCobranca === 'porcentagem' || novoValorMensal === 0) {
            await db.execute(
                "UPDATE empresas SET status_financeiro = 'adimplente' WHERE id = ?",
                [empresa_id]
            );
            return res.json({
                success: true,
                message: `Plano ${plano.nome} ativado com sucesso!`,
                plano,
                requer_pagamento: false
            });
        }

        // 2. Verificar se já existe uma fatura pendente
        const [[faturaPendente]] = await db.query(`
            SELECT * FROM saas_faturas 
            WHERE empresa_id = ? AND status IN ('pendente', 'vencido')
            ORDER BY id DESC LIMIT 1
        `, [empresa_id]);

        let faturaId;
        let faturaObj;

        if (faturaPendente) {
            await db.execute(`
                UPDATE saas_faturas 
                SET saas_plano_id = ?,
                    descricao = ?,
                    valor = ?,
                    valor_base = ?,
                    pix_copia_cola = NULL,
                    pix_qr_code = NULL
                WHERE id = ?
            `, [
                plano.id,
                `Assinatura ${plano.nome} - Nuvy Pro`,
                novoValorMensal,
                novoValorMensal,
                faturaPendente.id
            ]);
            faturaId = faturaPendente.id;
            faturaObj = {
                ...faturaPendente,
                id: faturaId,
                empresa_id,
                saas_plano_id: plano.id,
                descricao: `Assinatura ${plano.nome} - Nuvy Pro`,
                valor: novoValorMensal
            };
        } else {
            const [insertRes] = await db.execute(`
                INSERT INTO saas_faturas 
                  (empresa_id, saas_plano_id, descricao, valor, valor_base, data_vencimento, status, forma_pagamento)
                VALUES (?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'pendente', 'pix')
            `, [
                empresa_id,
                plano.id,
                `Assinatura ${plano.nome} - Nuvy Pro`,
                novoValorMensal,
                novoValorMensal
            ]);
            faturaId = insertRes.insertId;
            faturaObj = {
                id: faturaId,
                empresa_id,
                saas_plano_id: plano.id,
                descricao: `Assinatura ${plano.nome} - Nuvy Pro`,
                valor: novoValorMensal
            };
        }

        // 3. Se tiver débito automático ativo com cartão de crédito salvo
        if (empresa.debito_automatico_ativo === 1 && empresa.card_token) {
            try {
                const { cobrarCartaoFaturaSaas } = require('../services/saasCartaoService');
                const resCartao = await cobrarCartaoFaturaSaas(
                    faturaObj,
                    empresa.card_token,
                    empresa
                );
                if (resCartao.success) {
                    await db.execute(`
                        UPDATE saas_faturas 
                        SET status = 'pago', pago_em = NOW(), forma_pagamento = 'cartao',
                            cartao_transacao_id = ?, cartao_mensagem_erro = NULL
                        WHERE id = ?
                    `, [resCartao.transacaoId, faturaId]);
                    await db.execute("UPDATE empresas SET status_financeiro = 'adimplente' WHERE id = ?", [empresa_id]);
                    return res.json({
                        success: true,
                        message: `Plano ${plano.nome} contratado e pago com sucesso no seu cartão!`,
                        pago_no_cartao: true,
                        requer_pagamento: false
                    });
                }
            } catch (cardErr) {
                console.warn("[Assinar Plano] Erro ao tentar débito no cartão:", cardErr.message);
            }
        }

        // 4. Gerar PIX dinâmico do Mercado Pago
        let pixRes = { pix_copia_cola: null, pix_qr_code: null };
        try {
            pixRes = await gerarPixFaturaSaas(faturaObj);
        } catch (pixErr) {
            console.warn("[Assinar Plano] Erro ao gerar PIX:", pixErr.message);
        }

        res.json({
            success: true,
            message: `Plano ${plano.nome} selecionado! Efetue o pagamento via PIX para ativar.`,
            fatura_id: faturaId,
            valor: novoValorMensal,
            plano,
            requer_pagamento: true,
            pix_copia_cola: pixRes.pix_copia_cola,
            pix_qr_code: pixRes.pix_qr_code
        });
    } catch (err) {
        console.error("Erro ao assinar plano SaaS:", err);
        res.status(500).json({ message: "Erro ao processar assinatura do plano" });
    }
};

// ── GERAR PIX DINÂMICO MERCADO PAGO ──
exports.gerarPixFatura = async (req, res) => {
    try {
        const { id } = req.params;
        const [[fatura]] = await db.query("SELECT * FROM saas_faturas WHERE id = ?", [id]);

        if (!fatura) {
            return res.status(404).json({ message: "Fatura não encontrada" });
        }

        if (fatura.status === "pago") {
            return res.status(400).json({ message: "Esta fatura já foi paga" });
        }

        // Se já tiver chave PIX gerada, retornar direto
        if (fatura.pix_copia_cola && fatura.pix_qr_code) {
            return res.json({
                pix_copia_cola: fatura.pix_copia_cola,
                pix_qr_code: fatura.pix_qr_code,
                fatura_id: fatura.id,
                valor: fatura.valor
            });
        }

        // Gerar nova cobrança PIX via Mercado Pago API
        const resultado = await gerarPixFaturaSaas(fatura);

        res.json({
            pix_copia_cola: resultado.pix_copia_cola,
            pix_qr_code: resultado.pix_qr_code,
            fatura_id: fatura.id,
            valor: fatura.valor
        });
    } catch (err) {
        console.error("Erro ao gerar PIX para fatura SaaS:", err);
        res.status(500).json({ message: err.message || "Erro ao gerar PIX" });
    }
};

// ── WEBHOOK MERCADO PAGO PARA PIX SAAS ──
exports.processarWebhookPix = async (req, res) => {
    try {
        const paymentId = req.body?.data?.id || req.body?.id || req.query?.id || req.query?.['data.id'];

        if (!paymentId) {
            return res.status(200).send("OK");
        }

        let accessToken = process.env.MP_ACCESS_TOKEN;
        try {
            const [rows] = await db.query(
                "SELECT config_json FROM empresa_configs WHERE empresa_id = 1 AND config_type = 'mercadopago' LIMIT 1"
            );
            if (rows.length > 0 && rows[0].config_json) {
                const config = typeof rows[0].config_json === 'string' ? JSON.parse(rows[0].config_json) : rows[0].config_json;
                if (config && config.access_token) {
                    accessToken = config.access_token;
                }
            }
        } catch (e) { }

        if (!accessToken) {
            try {
                const [rowsFB] = await db.query(
                    "SELECT config_json FROM empresa_configs WHERE config_type = 'mercadopago' LIMIT 1"
                );
                if (rowsFB.length > 0 && rowsFB[0].config_json) {
                    const configF = typeof rowsFB[0].config_json === 'string' ? JSON.parse(rowsFB[0].config_json) : rowsFB[0].config_json;
                    if (configF && configF.access_token) {
                        accessToken = configF.access_token;
                    }
                }
            } catch (e) { }
        }

        if (!accessToken) {
            try {
                const [rowsLeg] = await db.query(
                    "SELECT access_token FROM config_mercadopago WHERE access_token IS NOT NULL AND access_token != '' LIMIT 1"
                );
                if (rowsLeg.length > 0 && rowsLeg[0].access_token) {
                    accessToken = rowsLeg[0].access_token;
                }
            } catch (e) { }
        }

        if (!accessToken) {
            console.error("[Webhook PIX SaaS] Access Token Mercado Pago não encontrado em empresa_configs.");
            return res.status(200).send("OK");
        }

        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            console.error("[Webhook PIX SaaS] Erro ao consultar pagamento MP ID:", paymentId);
            return res.status(200).send("OK");
        }

        const payment = await response.json();
        const extRef = payment.external_reference || "";

        if (extRef.startsWith("saas_fatura_") && payment.status === "approved") {
            const faturaId = parseInt(extRef.replace("saas_fatura_", ""));

            const [[fatura]] = await db.query("SELECT * FROM saas_faturas WHERE id = ?", [faturaId]);

            if (fatura && fatura.status !== "pago") {
                await db.execute(
                    "UPDATE saas_faturas SET status = 'pago', pago_em = NOW(), forma_pagamento = 'pix' WHERE id = ?",
                    [faturaId]
                );

                await db.execute(
                    "UPDATE empresas SET status_financeiro = 'adimplente' WHERE id = ?",
                    [fatura.empresa_id]
                );

                console.log(`[Webhook PIX SaaS] Fatura #${faturaId} PAGA com sucesso! Empresa #${fatura.empresa_id} reativada.`);
            }
        }

        res.status(200).send("OK");
    } catch (err) {
        console.error("Erro no processamento do Webhook PIX SaaS:", err);
        res.status(200).send("OK");
    }
};

// ── CRIAR FATURA AVULSA OU AUTOMÁTICA ──
exports.criarFatura = async (req, res) => {
    try {
        const {
            empresa_id,
            saas_plano_id,
            descricao,
            valor,
            valor_base,
            total_vendas,
            comissao_porcentagem,
            valor_comissao,
            data_vencimento,
            forma_pagamento,
            pix_copia_cola,
            pix_qr_code
        } = req.body;

        if (!empresa_id || valor === undefined || !data_vencimento) {
            return res.status(400).json({ message: "Empresa, valor e data de vencimento são obrigatórios" });
        }

        const [[empresa]] = await db.query("SELECT nome, saas_plano_id FROM empresas WHERE id = ?", [empresa_id]);
        if (!empresa) {
            return res.status(404).json({ message: "Empresa não encontrada" });
        }

        const finalPlanoId = saas_plano_id || empresa.saas_plano_id || null;
        const descFinal = descricao || `Fatura Mensal - ${empresa.nome}`;

        const [result] = await db.execute(
            `INSERT INTO saas_faturas (empresa_id, saas_plano_id, descricao, valor, valor_base, total_vendas, comissao_porcentagem, valor_comissao, data_vencimento, status, forma_pagamento, pix_copia_cola, pix_qr_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?)`,
            [
                empresa_id,
                finalPlanoId,
                descFinal,
                parseFloat(valor),
                parseFloat(valor_base || 0),
                parseFloat(total_vendas || 0),
                parseFloat(comissao_porcentagem || 0),
                parseFloat(valor_comissao || 0),
                data_vencimento,
                forma_pagamento || 'pix',
                pix_copia_cola || null,
                pix_qr_code || null
            ]
        );

        res.status(201).json({
            id: result.insertId,
            message: "Fatura gerada com sucesso!"
        });
    } catch (err) {
        console.error("Erro ao criar fatura SaaS:", err);
        res.status(500).json({ message: "Erro ao gerar fatura" });
    }
};

// ── CALCULAR PREVIEW DE COMISSÃO & FATURA ──
exports.calcularPreviewFatura = async (req, res) => {
    try {
        const { empresa_id, dias } = req.query;
        if (!empresa_id) {
            return res.status(400).json({ message: "empresa_id é obrigatório" });
        }

        const [[empresa]] = await db.query(
            "SELECT id, nome, tipo_cobranca, valor_mensal, comissao_porcentagem, dia_vencimento FROM empresas WHERE id = ?",
            [empresa_id]
        );

        if (!empresa) {
            return res.status(404).json({ message: "Empresa não encontrada" });
        }

        const intervaloDias = parseInt(dias || '30', 10);

        const [[vendasRow]] = await db.query(`
            SELECT IFNULL(SUM(valor), 0) AS total_vendas, COUNT(*) AS quantidade_vendas
            FROM pagamentos
            WHERE empresa_id = ? AND status = 'approved'
              AND criado_em >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        `, [empresa_id, intervaloDias]);

        const totalVendas = parseFloat(vendasRow?.total_vendas || 0);
        const qtdVendas = parseInt(vendasRow?.quantidade_vendas || 0, 10);

        const valorBase = (empresa.tipo_cobranca === 'porcentagem') ? 0 : parseFloat(empresa.valor_mensal || 0);
        const comissaoPct = (empresa.tipo_cobranca === 'fixo') ? 0 : parseFloat(empresa.comissao_porcentagem || 0);
        const valorComissao = (totalVendas * comissaoPct) / 100;
        const valorTotal = valorBase + valorComissao;

        const mesAtualStr = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        let desc = `Mensalidade SaaS Hotspot - ${mesAtualStr}`;
        if (empresa.tipo_cobranca === 'porcentagem') {
            desc = `SaaS Revenue Share - ${mesAtualStr} (Comissão ${comissaoPct}% s/ R$ ${totalVendas.toFixed(2)} em vendas)`;
        } else if (empresa.tipo_cobranca === 'hibrido' && valorComissao > 0) {
            desc = `Mensalidade SaaS + Comissão - ${mesAtualStr} (Fixo: R$ ${valorBase.toFixed(2)} + ${comissaoPct}% s/ R$ ${totalVendas.toFixed(2)} = R$ ${valorComissao.toFixed(2)})`;
        }

        res.json({
            empresa_id: empresa.id,
            empresa_nome: empresa.nome,
            tipo_cobranca: empresa.tipo_cobranca || 'fixo',
            valor_base: valorBase,
            total_vendas: totalVendas,
            quantidade_vendas: qtdVendas,
            comissao_porcentagem: comissaoPct,
            valor_comissao: valorComissao,
            valor_total: valorTotal,
            descricao_sugerida: desc,
            periodo_dias: intervaloDias
        });
    } catch (err) {
        console.error("Erro ao calcular preview da fatura:", err);
        res.status(500).json({ message: "Erro ao calcular prévia da fatura" });
    }
};

// ── GERAR MENSALIDADE MANUALMENTE COM COMISSÃO ──
exports.gerarMensalidadeManual = async (req, res) => {
    try {
        const { empresa_id, data_vencimento } = req.body;
        if (!empresa_id) {
            return res.status(400).json({ message: "empresa_id é obrigatório" });
        }

        const [[empresa]] = await db.query(
            "SELECT id, nome, saas_plano_id, tipo_cobranca, valor_mensal, comissao_porcentagem, dia_vencimento FROM empresas WHERE id = ?",
            [empresa_id]
        );

        if (!empresa) {
            return res.status(404).json({ message: "Empresa não encontrada" });
        }

        const now = new Date();
        const dia = Math.min(Math.max(empresa.dia_vencimento || 10, 1), 28);
        const vencStr = data_vencimento || new Date(now.getFullYear(), now.getMonth(), dia).toISOString().split('T')[0];

        const [[vendasRow]] = await db.query(`
            SELECT IFNULL(SUM(valor), 0) AS total_vendas
            FROM pagamentos
            WHERE empresa_id = ? AND status = 'approved'
              AND criado_em >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `, [empresa_id]);

        const totalVendas = parseFloat(vendasRow?.total_vendas || 0);
        const valorBase = (empresa.tipo_cobranca === 'porcentagem') ? 0 : parseFloat(empresa.valor_mensal || 0);
        const comissaoPct = (empresa.tipo_cobranca === 'fixo') ? 0 : parseFloat(empresa.comissao_porcentagem || 0);
        const valorComissao = (totalVendas * comissaoPct) / 100;
        const valorTotal = valorBase + valorComissao;

        const mesAtualStr = new Date(vencStr).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        let desc = `Mensalidade SaaS Hotspot - ${mesAtualStr}`;
        if (empresa.tipo_cobranca === 'porcentagem') {
            desc = `SaaS Revenue Share - ${mesAtualStr} (Comissão ${comissaoPct}% s/ R$ ${totalVendas.toFixed(2)} em vendas)`;
        } else if (empresa.tipo_cobranca === 'hibrido' && valorComissao > 0) {
            desc = `Mensalidade SaaS + Comissão - ${mesAtualStr} (Fixo: R$ ${valorBase.toFixed(2)} + ${comissaoPct}% s/ R$ ${totalVendas.toFixed(2)} = R$ ${valorComissao.toFixed(2)})`;
        }

        const [result] = await db.execute(`
            INSERT INTO saas_faturas 
                (empresa_id, saas_plano_id, descricao, valor, valor_base, total_vendas, comissao_porcentagem, valor_comissao, data_vencimento, status, forma_pagamento)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', 'pix')
        `, [
            empresa.id,
            empresa.saas_plano_id || null,
            desc,
            valorTotal,
            valorBase,
            totalVendas,
            comissaoPct,
            valorComissao,
            vencStr
        ]);

        res.status(201).json({
            id: result.insertId,
            message: "Fatura gerada com sucesso!",
            valor_total: valorTotal,
            vencimento: vencStr
        });
    } catch (err) {
        console.error("Erro ao gerar mensalidade manual:", err);
        res.status(500).json({ message: "Erro ao gerar fatura mensal" });
    }
};

// ── DAR BAIXA (CONFIRMAR PAGAMENTO) ──
exports.darBaixaFatura = async (req, res) => {
    try {
        const { id } = req.params;

        const [[fatura]] = await db.query("SELECT * FROM saas_faturas WHERE id = ?", [id]);
        if (!fatura) {
            return res.status(404).json({ message: "Fatura não encontrada" });
        }

        await db.execute(
            "UPDATE saas_faturas SET status = 'pago', pago_em = NOW() WHERE id = ?",
            [id]
        );

        await db.execute(
            "UPDATE empresas SET status_financeiro = 'adimplente' WHERE id = ?",
            [fatura.empresa_id]
        );

        res.json({ message: "Pagamento confirmado com sucesso! Empresa atualizada para Adimplente." });
    } catch (err) {
        console.error("Erro ao dar baixa na fatura:", err);
        res.status(500).json({ message: "Erro ao confirmar pagamento" });
    }
};

// ── CANCELAR FATURA ──
exports.cancelarFatura = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute("UPDATE saas_faturas SET status = 'cancelado' WHERE id = ?", [id]);
        res.json({ message: "Fatura cancelada com sucesso!" });
    } catch (err) {
        console.error("Erro ao cancelar fatura:", err);
        res.status(500).json({ message: "Erro ao cancelar fatura" });
    }
};

// ── NOTIFICAR EMPRESA VIA WHATSAPP (ÚNICO / MANUAL) ──
exports.notificarWhatsApp = async (req, res) => {
    try {
        const { id } = req.params;

        const [[fatura]] = await db.query(`
          SELECT f.*, e.nome AS empresa_nome, e.telefone AS empresa_telefone
          FROM saas_faturas f
          JOIN empresas e ON e.id = f.empresa_id
          WHERE f.id = ?
        `, [id]);

        if (!fatura) {
            return res.status(404).json({ message: "Fatura não encontrada" });
        }

        const resNotif = await dispararNotificacaoWhatsappFatura(fatura, 'manual');

        res.json({
            message: "Notificação gerada com sucesso!",
            enviado_automacao: resNotif.ok,
            whatsapp_link: resNotif.whatsapp_link,
            mensagem_texto: resNotif.mensagem_texto
        });
    } catch (err) {
        console.error("Erro ao notificar via WhatsApp:", err);
        res.status(500).json({ message: "Erro ao gerar notificação via WhatsApp" });
    }
};

// ── EXECUTAR VARREDURA MANUAL DE DISPAROS DE WHATSAPP SAAS ──
exports.executarDisparosManuaisWhatsapp = async (req, res) => {
    try {
        const resultado = await processarDisparosWhatsappSaas();
        res.json({
            message: "Varredura de disparos de WhatsApp executada com sucesso!",
            detalhes: resultado
        });
    } catch (err) {
        console.error("Erro ao executar disparos manuais:", err);
        res.status(500).json({ message: "Erro ao executar disparos de WhatsApp" });
    }
};

// Exportar helpers para uso no Job de billing
exports.processarDisparosWhatsappSaas = processarDisparosWhatsappSaas;

// ── OBTER ESTATÍSTICAS FINANCEIRAS E OPERACIONAIS DO SAAS ──
exports.getDashboardStats = async (req, res) => {
    try {
        const [[mrrRow]] = await db.query(`
            SELECT SUM(valor_mensal) AS mrr
            FROM empresas
            WHERE ativo = 1 AND slug != 'default'
        `);

        const [[recebidoRow]] = await db.query(`
            SELECT SUM(valor) AS total_recebido
            FROM saas_faturas
            WHERE status = 'pago' AND MONTH(pago_em) = MONTH(CURRENT_DATE()) AND YEAR(pago_em) = YEAR(CURRENT_DATE())
        `);

        const [[pendenteRow]] = await db.query(`
            SELECT SUM(valor) AS total_pendente
            FROM saas_faturas
            WHERE status = 'pendente'
        `);

        const [[vencidoRow]] = await db.query(`
            SELECT SUM(valor) AS total_vencido
            FROM saas_faturas
            WHERE status = 'vencido'
        `);

        const [statusEmpresas] = await db.query(`
            SELECT status_financeiro, COUNT(*) AS total
            FROM empresas
            WHERE slug != 'default'
            GROUP BY status_financeiro
        `);

        // Empresas em Período de Teste (Trial Tracker)
        const [empresasTrial] = await db.query(`
            SELECT 
                id, nome, slug, email, telefone, status_financeiro, trial_ate, criado_em,
                CASE 
                    WHEN trial_ate IS NOT NULL THEN DATEDIFF(trial_ate, CURDATE())
                    ELSE GREATEST(0, 14 - DATEDIFF(CURDATE(), criado_em))
                END AS dias_restantes
            FROM empresas
            WHERE slug != 'default' AND (status_financeiro = 'trial' OR (trial_ate IS NOT NULL AND trial_ate >= CURDATE()))
            ORDER BY trial_ate ASC, id DESC
        `);

        // Totais de Equipamentos Multi-Vendor
        const [[gatewaysRow]] = await db.query(`
            SELECT 
                SUM(CASE WHEN tipo IS NULL OR LOWER(tipo) = 'mikrotik' THEN 1 ELSE 0 END) AS total_mikrotik,
                SUM(CASE WHEN LOWER(tipo) = 'omada' THEN 1 ELSE 0 END) AS total_omada,
                SUM(CASE WHEN LOWER(tipo) = 'unifi' THEN 1 ELSE 0 END) AS total_unifi,
                COUNT(*) AS total_gateways
            FROM mikrotiks
        `);

        // Conexões Ativas Globais (Ao Vivo)
        const [[conexoesRow]] = await db.query(`
            SELECT COUNT(*) AS total_conexoes_agora FROM radacct WHERE acctstoptime IS NULL
        `);

        // Leads Globais Capturados no Mês
        const [[leadsRow]] = await db.query(`
            SELECT COUNT(*) AS total_leads_mes FROM leads WHERE criado_em >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `);

        const [comissoesEmpresas] = await db.query(`
            SELECT 
                e.id, e.nome, e.tipo_cobranca, e.comissao_porcentagem, e.valor_mensal, e.status_financeiro,
                IFNULL(SUM(f.valor), 0) AS total_faturado
            FROM empresas e
            LEFT JOIN saas_faturas f ON f.empresa_id = e.id AND f.status = 'pago'
            WHERE e.slug != 'default'
            GROUP BY e.id
        `);

        res.json({
            mrr: parseFloat(mrrRow?.mrr || 0),
            total_recebido_mes: parseFloat(recebidoRow?.total_recebido || 0),
            total_pendente: parseFloat(pendenteRow?.total_pendente || 0),
            total_vencido: parseFloat(vencidoRow?.total_vencido || 0),
            status_empresas: statusEmpresas,
            empresas_trial: empresasTrial,
            gateways: {
                total_mikrotik: parseInt(gatewaysRow?.total_mikrotik || 0, 10),
                total_omada: parseInt(gatewaysRow?.total_omada || 0, 10),
                total_unifi: parseInt(gatewaysRow?.total_unifi || 0, 10),
                total_gateways: parseInt(gatewaysRow?.total_gateways || 0, 10)
            },
            conexoes_globais_agora: parseInt(conexoesRow?.total_conexoes_agora || 0, 10),
            leads_globais_mes: parseInt(leadsRow?.total_leads_mes || 0, 10),
            comissoes: comissoesEmpresas
        });
    } catch (err) {
        console.error("Erro ao obter estatísticas do SaaS:", err);
        res.status(500).json({ message: "Erro ao obter estatísticas financeiras" });
    }
};

// ── OBTER RELATÓRIO AVANÇADO & BI FINANCEIRO ──
exports.getRelatorioAvancado = async (req, res) => {
    try {
        // 1. Contagem de Empresas por Status
        const [[empresaStats]] = await db.query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN ativo = 1 AND status_financeiro IN ('adimplente', 'trial') THEN 1 ELSE 0 END) AS ativas,
                SUM(CASE WHEN status_financeiro IN ('inadimplente', 'suspenso') THEN 1 ELSE 0 END) AS inativas_inadimplentes
            FROM empresas
            WHERE slug != 'default'
        `);

        const totalEmpresas = parseInt(empresaStats?.total || 0, 10);
        const empresasAtivas = parseInt(empresaStats?.ativas || 0, 10);
        const empresasInadimplentes = parseInt(empresaStats?.inativas_inadimplentes || 0, 10);

        // 2. Churn Rate (%)
        const churnRate = totalEmpresas > 0 ? ((empresasInadimplentes / totalEmpresas) * 100).toFixed(1) : 0;

        // 3. Receita Fixa Mensal das Empresas Ativas
        const [[fixoRow]] = await db.query(`
            SELECT IFNULL(SUM(valor_mensal), 0) AS mrr_fixo
            FROM empresas
            WHERE ativo = 1 AND slug != 'default'
        `);
        const mrrFixo = parseFloat(fixoRow?.mrr_fixo || 0);

        // 4. Média de Comissões dos últimos 3 meses
        const [[comissaoMediaRow]] = await db.query(`
            SELECT IFNULL(SUM(valor_comissao) / 3, 0) AS mrr_comissao_media
            FROM saas_faturas
            WHERE status = 'pago' AND pago_em >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        `);
        const mrrComissao = parseFloat(comissaoMediaRow?.mrr_comissao_media || 0);

        const mrr = mrrFixo + mrrComissao;
        const arr = mrr * 12;
        const arpu = empresasAtivas > 0 ? (mrr / empresasAtivas) : 0;

        // 5. Histórico de 12 Meses (Série Temporal)
        const [historicoMeses] = await db.query(`
            SELECT 
                DATE_FORMAT(data_vencimento, '%Y-%m') AS ano_mes,
                DATE_FORMAT(data_vencimento, '%b/%y') AS label_mes,
                IFNULL(SUM(valor), 0) AS total_faturado,
                IFNULL(SUM(valor_base), 0) AS total_base,
                IFNULL(SUM(valor_comissao), 0) AS total_comissao,
                IFNULL(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0) AS total_pago,
                IFNULL(SUM(CASE WHEN status IN ('pendente', 'vencido') THEN valor ELSE 0 END), 0) AS total_aberto
            FROM saas_faturas
            WHERE data_vencimento >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(data_vencimento, '%Y-%m'), DATE_FORMAT(data_vencimento, '%b/%y')
            ORDER BY ano_mes ASC
        `);

        // 6. Distribuição de Planos
        const [distribuicaoPlanos] = await db.query(`
            SELECT 
                tipo_cobranca,
                COUNT(*) AS total
            FROM empresas
            WHERE slug != 'default'
            GROUP BY tipo_cobranca
        `);

        // 7. Ranking de Empresas Clientes por Receita
        const [rankingEmpresas] = await db.query(`
            SELECT 
                e.id, e.nome, e.slug, e.tipo_cobranca, e.valor_mensal, e.comissao_porcentagem, e.status_financeiro,
                IFNULL(SUM(f.valor), 0) AS total_pago_historico,
                IFNULL(SUM(f.valor_comissao), 0) AS total_comissao_historico,
                COUNT(f.id) AS total_faturas
            FROM empresas e
            LEFT JOIN saas_faturas f ON f.empresa_id = e.id AND f.status = 'pago'
            WHERE e.slug != 'default'
            GROUP BY e.id
            ORDER BY total_pago_historico DESC, e.id ASC
            LIMIT 10
        `);

        // 8. Faturamento do Mês Corrente e do Ano
        const [[faturamentoAnoRow]] = await db.query(`
            SELECT 
                IFNULL(SUM(CASE WHEN YEAR(pago_em) = YEAR(CURRENT_DATE()) THEN valor ELSE 0 END), 0) AS faturado_ano,
                IFNULL(SUM(CASE WHEN MONTH(pago_em) = MONTH(CURRENT_DATE()) AND YEAR(pago_em) = YEAR(CURRENT_DATE()) THEN valor ELSE 0 END), 0) AS faturado_mes
            FROM saas_faturas
            WHERE status = 'pago'
        `);

        res.json({
            kpis: {
                mrr,
                mrr_fixo: mrrFixo,
                mrr_comissao: mrrComissao,
                arr,
                arpu,
                churn_rate: parseFloat(churnRate),
                total_empresas: totalEmpresas,
                empresas_ativas: empresasAtivas,
                empresas_inadimplentes: empresasInadimplentes,
                faturado_mes: parseFloat(faturamentoAnoRow?.faturado_mes || 0),
                faturado_ano: parseFloat(faturamentoAnoRow?.faturado_ano || 0)
            },
            historico_meses: historicoMeses,
            distribuicao_planos: distribuicaoPlanos,
            ranking_empresas: rankingEmpresas
        });
    } catch (err) {
        console.error("Erro ao obter relatório avançado SaaS:", err);
        res.status(500).json({ message: "Erro ao gerar relatório financeiro" });
    }
};

// ── EXPORTAR FATURAS SAAS EM FORMATO CSV (EXCEL) ──
exports.exportarCSV = async (req, res) => {
    try {
        const { status, empresa_id } = req.query;
        let query = `
          SELECT f.*,
            e.nome AS empresa_nome,
            e.slug AS empresa_slug
          FROM saas_faturas f
          JOIN empresas e ON e.id = f.empresa_id
          WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += " AND f.status = ?";
            params.push(status);
        }
        if (empresa_id) {
            query += " AND f.empresa_id = ?";
            params.push(empresa_id);
        }

        query += " ORDER BY f.data_vencimento DESC, f.id DESC";

        const [faturas] = await db.query(query, params);

        let csvContent = "\uFEFF";
        csvContent += "ID;Empresa;Descrição;Valor Base (R$);Vendas Mês (R$);Comissão (%);Valor Comissão (R$);Valor Total (R$);Vencimento;Status;Forma Pagamento;Pago Em\n";

        for (const f of faturas) {
            const vencFmt = f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString('pt-BR') : '';
            const pagoFmt = f.pago_em ? new Date(f.pago_em).toLocaleDateString('pt-BR') : '';
            const descLimpa = (f.descricao || '').replace(/;/g, ',');

            csvContent += `${f.id};"${f.empresa_nome}";"${descLimpa}";${parseFloat(f.valor_base || 0).toFixed(2)};${parseFloat(f.total_vendas || 0).toFixed(2)};${parseFloat(f.comissao_porcentagem || 0).toFixed(2)};${parseFloat(f.valor_comissao || 0).toFixed(2)};${parseFloat(f.valor || 0).toFixed(2)};${vencFmt};${f.status};${f.forma_pagamento || 'pix'};${pagoFmt}\n`;
        }

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=faturas_saas_hotspot.csv");
        res.status(200).send(csvContent);
    } catch (err) {
        console.error("Erro ao exportar CSV das faturas:", err);
        res.status(500).json({ message: "Erro ao gerar arquivo CSV" });
    }
};

// ── CONSULTA E EMISSÃO DE PIX VIA BOT / N8N / WHATSAPP ──
exports.consultaPixBot = async (req, res) => {
    try {
        const telefone = req.body?.telefone || req.query?.telefone;
        if (!telefone) {
            return res.status(400).json({ message: "O parâmetro 'telefone' é obrigatório" });
        }

        const { consultarEEmitirPixSaasPorTelefone } = require("../services/saasBotService");
        const resultado = await consultarEEmitirPixSaasPorTelefone(telefone);

        res.json(resultado);
    } catch (err) {
        console.error("Erro ao consultar PIX via bot:", err);
        res.status(500).json({ message: "Erro ao consultar 2ª via do PIX" });
    }
};


