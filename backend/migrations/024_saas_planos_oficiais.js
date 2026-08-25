require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 024: Planos Comerciais Oficiais SaaS ===\n');

        // 1. Adicionar colunas 'destaque' e 'recursos' se não existirem
        const [cols] = await conn.execute(`SHOW COLUMNS FROM saas_planos`);
        const colNames = cols.map(c => c.Field);

        if (!colNames.includes('destaque')) {
            console.log('Adicionando coluna destaque na tabela saas_planos...');
            await conn.execute(`ALTER TABLE saas_planos ADD COLUMN destaque TINYINT(1) DEFAULT 0 AFTER ativo`);
        }

        if (!colNames.includes('recursos')) {
            console.log('Adicionando coluna recursos na tabela saas_planos...');
            await conn.execute(`ALTER TABLE saas_planos ADD COLUMN recursos TEXT NULL AFTER destaque`);
        }

        // 2. Atualizar ou Inserir os Planos Comerciais Oficiais
        console.log('\nAtualizando/Inserindo os Planos Oficiais NuvyCore...');

        const planosOficiais = [
            {
                nome: 'Plano Start',
                descricao: 'Ideal para pequenos comércios, cafés e consultórios que necessitam de Wi-Fi rápido e conformidade com a LGPD.',
                tipo_cobranca: 'fixo',
                valor_mensal: 97.00,
                comissao_porcentagem: 0.00,
                limite_mikrotiks: 1,
                limite_portais: 1,
                destaque: 0,
                ativo: 1,
                recursos: JSON.stringify([
                    "1 Roteador MikroTik",
                    "1 Portal Captivo",
                    "Captura de Leads & LGPD Ilimitada",
                    "Login Social (Google / Facebook)",
                    "Dashboard de Métricas em Tempo Real",
                    "Suporte Comercial via WhatsApp"
                ])
            },
            {
                nome: 'Plano Pro (Mais Popular)',
                descricao: 'Nosso carro-chefe para negócios em crescimento. Inclui CRM integrado, automações de WhatsApp e vendas de Wi-Fi pago.',
                tipo_cobranca: 'fixo',
                valor_mensal: 197.00,
                comissao_porcentagem: 0.00,
                limite_mikrotiks: 3,
                limite_portais: 5,
                destaque: 1,
                ativo: 1,
                recursos: JSON.stringify([
                    "Até 3 Roteadores MikroTik",
                    "Até 5 Portais Captivos",
                    "Tudo do Plano Start",
                    "CRM com Automações WhatsApp (Boas-vindas, NPS, Cupons)",
                    "Venda de Wi-Fi Pago / Fichas com PIX Automático",
                    "E-mail Marketing & Disparos em Massa",
                    "Suporte Prioritário no WhatsApp"
                ])
            },
            {
                nome: 'Plano Enterprise',
                descricao: 'Para redes, franquias e médias empresas com alto fluxo de visitantes e múltiplas unidades de atendimento.',
                tipo_cobranca: 'fixo',
                valor_mensal: 397.00,
                comissao_porcentagem: 0.00,
                limite_mikrotiks: 10,
                limite_portais: 0, // 0 = ilimitado
                destaque: 0,
                ativo: 1,
                recursos: JSON.stringify([
                    "Até 10 Roteadores MikroTik",
                    "Portais Captivos Ilimitados",
                    "Tudo do Plano Pro",
                    "Gestão Multi-Filiais / Franquias",
                    "Múltiplos Grupos de Permissão",
                    "Acesso Remoto WebFig & Winbox Ilimitado",
                    "Suporte VIP com Gerente de Contas"
                ])
            },
            {
                nome: 'Plano Revenue Share (Comissão)',
                descricao: 'Sem mensalidade fixa. Ideal para eventos, hotéis e locais com foco em monetização de pacotes de internet.',
                tipo_cobranca: 'porcentagem',
                valor_mensal: 0.00,
                comissao_porcentagem: 10.00,
                limite_mikrotiks: 5,
                limite_portais: 10,
                destaque: 0,
                ativo: 1,
                recursos: JSON.stringify([
                    "Sem Mensalidade Fixa",
                    "10% de Comissão sobre Vendas Wi-Fi",
                    "Até 5 Roteadores MikroTik",
                    "Até 10 Portais Captivos",
                    "Venda de Fichas Wi-Fi com PIX Mercado Pago / EFI",
                    "Portal Financeiro de Auto-Cobrança"
                ])
            }
        ];

        for (const plano of planosOficiais) {
            // Verificar se o plano já existe pelo nome ou tipo
            const [existentes] = await conn.query(
                `SELECT id FROM saas_planos WHERE nome LIKE ? OR (tipo_cobranca = ? AND valor_mensal = ?) LIMIT 1`,
                [`%${plano.nome.split(' ')[1]}%`, plano.tipo_cobranca, plano.valor_mensal]
            );

            if (existentes.length > 0) {
                console.log(`Atualizando plano existente (ID: ${existentes[0].id}): ${plano.nome}...`);
                await conn.execute(
                    `UPDATE saas_planos 
                     SET nome = ?, descricao = ?, tipo_cobranca = ?, valor_mensal = ?, 
                         comissao_porcentagem = ?, limite_mikrotiks = ?, limite_portais = ?, 
                         destaque = ?, ativo = ?, recursos = ?
                     WHERE id = ?`,
                    [
                        plano.nome,
                        plano.descricao,
                        plano.tipo_cobranca,
                        plano.valor_mensal,
                        plano.comissao_porcentagem,
                        plano.limite_mikrotiks,
                        plano.limite_portais,
                        plano.destaque,
                        plano.ativo,
                        plano.recursos,
                        existentes[0].id
                    ]
                );
            } else {
                console.log(`Inserindo novo plano: ${plano.nome}...`);
                await conn.execute(
                    `INSERT INTO saas_planos (nome, descricao, tipo_cobranca, valor_mensal, comissao_porcentagem, limite_mikrotiks, limite_portais, destaque, ativo, recursos)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        plano.nome,
                        plano.descricao,
                        plano.tipo_cobranca,
                        plano.valor_mensal,
                        plano.comissao_porcentagem,
                        plano.limite_mikrotiks,
                        plano.limite_portais,
                        plano.destaque,
                        plano.ativo,
                        plano.recursos
                    ]
                );
            }
        }

        await conn.commit();
        console.log('\n=== Migration 024 concluída com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 024:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
