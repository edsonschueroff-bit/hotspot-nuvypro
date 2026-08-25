require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 017: CRM Automations (crm_automacoes + crm_automacoes_log) ===\n');

        // 1. CREATE TABLE crm_automacoes
        console.log('1. Criando tabela crm_automacoes...');
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS crm_automacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        tipo ENUM('boas_vindas', 'expiracao_aviso', 'pix_abandonado', 'retencao_ausente') NOT NULL,
        titulo VARCHAR(150) NOT NULL,
        mensagem TEXT NOT NULL,
        tempo_minutos INT DEFAULT 5,
        dias_ausente INT DEFAULT 15,
        ativo TINYINT(1) DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_crm_auto_empresa
          FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        UNIQUE KEY uq_empresa_tipo (empresa_id, tipo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log('   -> Tabela crm_automacoes criada.');

        // 2. CREATE TABLE crm_automacoes_log
        console.log('\n2. Criando tabela crm_automacoes_log...');
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS crm_automacoes_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        automacao_tipo VARCHAR(50) NOT NULL,
        telefone VARCHAR(50) NOT NULL,
        referencia_id VARCHAR(100) NULL,
        enviado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_crm_auto_log_empresa
          FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        INDEX idx_auto_log (empresa_id, automacao_tipo, telefone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log('   -> Tabela crm_automacoes_log criada.');

        await conn.commit();
        console.log('\n=== Migration 017 concluida com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 017:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
