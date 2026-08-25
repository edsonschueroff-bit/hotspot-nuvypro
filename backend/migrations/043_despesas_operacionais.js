const db = require('../db');

async function migrate() {
  console.log('=== Migration 043: Despesas Operacionais & Módulo DRE ===\n');

  try {
    // 1. Criar tabela despesas_operacionais
    await db.query(`
      CREATE TABLE IF NOT EXISTS despesas_operacionais (
        id INT PRIMARY KEY AUTO_INCREMENT,
        empresa_id INT NULL,
        descricao VARCHAR(255) NOT NULL,
        categoria VARCHAR(50) NOT NULL DEFAULT 'outros',
        tipo ENUM('fixa', 'variavel') NOT NULL DEFAULT 'fixa',
        valor DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        data_competencia DATE NOT NULL,
        data_vencimento DATE NULL,
        data_pagamento DATETIME NULL,
        recorrente TINYINT(1) NOT NULL DEFAULT 0,
        status ENUM('pago', 'pendente', 'cancelado') NOT NULL DEFAULT 'pago',
        observacoes TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_empresa_competencia (empresa_id, data_competencia),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabela 'despesas_operacionais' criada/verificada com sucesso.");

    console.log('\n🎉 Migration 043 concluída com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migration 043:', err);
    process.exit(1);
  }
}

migrate();
