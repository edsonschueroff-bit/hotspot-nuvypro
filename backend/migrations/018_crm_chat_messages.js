require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 018: CRM Chat Messages (crm_chat_messages) ===\n');

        console.log('1. Criando tabela crm_chat_messages...');
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS crm_chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        telefone VARCHAR(50) NOT NULL,
        cliente_nome VARCHAR(150) NULL,
        direcao ENUM('enviada', 'recebida') NOT NULL DEFAULT 'enviada',
        mensagem TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'enviado',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_crm_chat (empresa_id, telefone),
        CONSTRAINT fk_crm_chat_empresa
          FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log('   -> Tabela crm_chat_messages criada com sucesso.');

        await conn.commit();
        console.log('\n=== Migration 018 concluida com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 018:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
