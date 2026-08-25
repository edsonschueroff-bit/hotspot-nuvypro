require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 032: Webhooks Outbound Hub ===\n');

        // 1. Criar tabela empresa_webhooks
        console.log('1. Criando tabela empresa_webhooks...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS empresa_webhooks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                empresa_id INT NOT NULL,
                nome VARCHAR(120) NOT NULL,
                url VARCHAR(500) NOT NULL,
                secret VARCHAR(100) NULL,
                eventos JSON NOT NULL,
                ativo TINYINT(1) DEFAULT 1,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_empresa_webhooks_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                INDEX idx_empresa_webhooks (empresa_id, ativo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   -> Tabela empresa_webhooks criada com sucesso.');

        // 2. Criar tabela empresa_webhook_logs
        console.log('\n2. Criando tabela empresa_webhook_logs...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS empresa_webhook_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                empresa_id INT NOT NULL,
                webhook_id INT NOT NULL,
                evento VARCHAR(50) NOT NULL,
                payload JSON NOT NULL,
                status_code INT NULL,
                resposta_body TEXT NULL,
                sucesso TINYINT(1) DEFAULT 0,
                tentativas INT DEFAULT 1,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_empresa_webhook_logs_wh FOREIGN KEY (webhook_id) REFERENCES empresa_webhooks(id) ON DELETE CASCADE,
                CONSTRAINT fk_empresa_webhook_logs_emp FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                INDEX idx_empresa_webhook_logs_emp (empresa_id, criado_em),
                INDEX idx_empresa_webhook_logs_wh (webhook_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   -> Tabela empresa_webhook_logs criada com sucesso.');

        await conn.commit();
        console.log('\n=== Migration 032 concluída com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 032:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
