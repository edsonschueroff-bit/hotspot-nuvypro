require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 016: CRM Tables (crm_templates + crm_historico_envios) ===\n');

        // 1. CREATE TABLE crm_templates
        console.log('1. Criando tabela crm_templates...');
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS crm_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        titulo VARCHAR(150) NOT NULL,
        mensagem TEXT NOT NULL,
        ativo TINYINT(1) DEFAULT 1,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_crm_templates_empresa
          FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        INDEX idx_crm_templates_empresa (empresa_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log('   -> Tabela crm_templates criada (ou ja existia).');

        // 2. CREATE TABLE crm_historico_envios
        console.log('\n2. Criando tabela crm_historico_envios...');
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS crm_historico_envios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        cliente_nome VARCHAR(150) NULL,
        telefone VARCHAR(50) NOT NULL,
        mensagem TEXT NOT NULL,
        tipo_envio ENUM('api', 'manual') DEFAULT 'manual',
        status VARCHAR(50) DEFAULT 'enviado',
        enviado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_crm_historico_empresa
          FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        INDEX idx_crm_historico_empresa (empresa_id),
        INDEX idx_crm_historico_telefone (telefone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log('   -> Tabela crm_historico_envios criada (ou ja existia).');

        await conn.commit();
        console.log('\n=== Migration 016 concluida com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 016:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
