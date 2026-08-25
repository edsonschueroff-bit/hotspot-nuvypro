require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 020: Tabela saas_faturas ===\n');

        console.log('1. Criando tabela saas_faturas...');
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS saas_faturas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        saas_plano_id INT NULL,
        descricao VARCHAR(255) NOT NULL,
        valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        data_vencimento DATE NOT NULL,
        status ENUM('pendente', 'pago', 'vencido', 'cancelado') DEFAULT 'pendente',
        forma_pagamento ENUM('pix', 'boleto', 'cartao', 'manual') DEFAULT 'manual',
        pix_copia_cola TEXT NULL,
        pix_qr_code TEXT NULL,
        comprovante_url VARCHAR(500) NULL,
        pago_em DATETIME NULL,
        whatsapp_notificado_em DATETIME NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_saas_faturas_empresa
          FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        INDEX idx_saas_faturas_empresa (empresa_id),
        INDEX idx_saas_faturas_status (status),
        INDEX idx_saas_faturas_vencimento (data_vencimento)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log('   -> Tabela saas_faturas criada com sucesso!');

        await conn.commit();
        console.log('\n=== Migration 020 concluida com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 020:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
