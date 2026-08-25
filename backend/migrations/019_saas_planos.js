require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 019: Planos SaaS & Cadastro Comercial ===\n');

        // 1. CREATE TABLE saas_planos
        console.log('1. Criando tabela saas_planos...');
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS saas_planos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT NULL,
        tipo_cobranca ENUM('fixo', 'porcentagem', 'hibrido') DEFAULT 'fixo',
        valor_mensal DECIMAL(10,2) DEFAULT 0.00,
        comissao_porcentagem DECIMAL(5,2) DEFAULT 0.00,
        limite_mikrotiks INT DEFAULT 0,
        limite_portais INT DEFAULT 0,
        ativo TINYINT(1) DEFAULT 1,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log('   -> Tabela saas_planos criada (ou ja existia).');

        // 2. ALTER TABLE empresas (adicionar campos comerciais)
        console.log('\n2. Adicionando campos comerciais na tabela empresas...');

        const alterQueries = [
            `ALTER TABLE empresas ADD COLUMN saas_plano_id INT NULL AFTER id`,
            `ALTER TABLE empresas ADD COLUMN tipo_cobranca ENUM('fixo', 'porcentagem', 'hibrido') DEFAULT 'fixo' AFTER saas_plano_id`,
            `ALTER TABLE empresas ADD COLUMN valor_mensal DECIMAL(10,2) DEFAULT 0.00 AFTER tipo_cobranca`,
            `ALTER TABLE empresas ADD COLUMN comissao_porcentagem DECIMAL(5,2) DEFAULT 0.00 AFTER valor_mensal`,
            `ALTER TABLE empresas ADD COLUMN dia_vencimento INT DEFAULT 10 AFTER comissao_porcentagem`,
            `ALTER TABLE empresas ADD COLUMN status_financeiro ENUM('adimplente', 'inadimplente', 'trial', 'suspenso') DEFAULT 'trial' AFTER dia_vencimento`,
            `ALTER TABLE empresas ADD COLUMN trial_ate DATETIME NULL AFTER status_financeiro`
        ];

        for (const query of alterQueries) {
            try {
                await conn.execute(query);
            } catch (err) {
                if (!err.message.includes('Duplicate column name')) {
                    throw err;
                }
            }
        }
        console.log('   -> Campos comerciais adicionados/verificados na tabela empresas.');

        // 3. Seed Planos SaaS Padrão se tabela estiver vazia
        const [[{ count }]] = await conn.query('SELECT COUNT(*) as count FROM saas_planos');
        if (count === 0) {
            console.log('\n3. Inserindo planos SaaS padrao...');
            await conn.execute(`
        INSERT INTO saas_planos (nome, descricao, tipo_cobranca, valor_mensal, comissao_porcentagem, limite_mikrotiks, limite_portais, ativo)
        VALUES 
        ('Plano Standard Mensal', 'Mensalidade fixa para estabelecimentos comerciais com foco em captura LGPD e marketing.', 'fixo', 99.00, 0.00, 2, 5, 1),
        ('Plano Revenue Share (Comissão)', 'Sem mensalidade fixa. Cobrança de 10% sobre todas as vendas de pacotes WiFi no portal.', 'porcentagem', 0.00, 10.00, 5, 10, 1),
        ('Plano Pro Ilimitado', 'Mensalidade fixa com direito a múltiplos roteadores e portais ilimitados.', 'fixo', 199.00, 0.00, 0, 0, 1)
      `);
            console.log('   -> 3 Planos SaaS padrão inseridos com sucesso!');
        }

        await conn.commit();
        console.log('\n=== Migration 019 concluida com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 019:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
