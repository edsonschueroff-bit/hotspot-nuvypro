require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function colExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].total > 0;
}

async function up() {
  const conn = await db.getConnection();
  try {
    console.log('=== Migration 038: Cartão de Crédito Recorrente SaaS ===\n');

    // 1. Colunas na tabela empresas
    const colunasEmpresas = [
      { name: 'card_token', type: "VARCHAR(255) NULL COMMENT 'Token seguro do cartão no gateway'" },
      { name: 'card_brand', type: "VARCHAR(50) NULL COMMENT 'Bandeira (visa, master, elo, etc)'" },
      { name: 'card_last4', type: "VARCHAR(4) NULL COMMENT 'Últimos 4 dígitos do cartão'" },
      { name: 'card_holder_name', type: "VARCHAR(150) NULL COMMENT 'Nome impresso no cartão'" },
      { name: 'card_exp_month', type: "INT NULL COMMENT 'Mês de expiração'" },
      { name: 'card_exp_year', type: "INT NULL COMMENT 'Ano de expiração'" },
      { name: 'forma_pagamento_preferida', type: "ENUM('pix', 'credit_card') DEFAULT 'pix'" },
      { name: 'debito_automatico_ativo', type: "TINYINT(1) DEFAULT 1 COMMENT '1=Ativo, 0=Desativado'" }
    ];

    for (const col of colunasEmpresas) {
      const exists = await colExists(conn, 'empresas', col.name);
      if (!exists) {
        await conn.execute(`ALTER TABLE empresas ADD COLUMN ${col.name} ${col.type}`);
        console.log(`   -> Coluna empresas.${col.name} adicionada.`);
      } else {
        console.log(`   -> Coluna empresas.${col.name} já existe.`);
      }
    }

    // 2. Colunas na tabela saas_faturas
    const colunasFaturas = [
      { name: 'cartao_transacao_id', type: "VARCHAR(100) NULL COMMENT 'ID da transação no gateway de cartão'" },
      { name: 'cartao_mensagem_erro', type: "TEXT NULL COMMENT 'Mensagem de recusa do cartão'" },
      { name: 'tentativas_cobranca', type: "INT DEFAULT 0 COMMENT 'Quantidade de tentativas de cobrança'" }
    ];

    for (const col of colunasFaturas) {
      const exists = await colExists(conn, 'saas_faturas', col.name);
      if (!exists) {
        await conn.execute(`ALTER TABLE saas_faturas ADD COLUMN ${col.name} ${col.type}`);
        console.log(`   -> Coluna saas_faturas.${col.name} adicionada.`);
      } else {
        console.log(`   -> Coluna saas_faturas.${col.name} já existe.`);
      }
    }

    console.log('\n=== Migration 038 concluída com sucesso! ===');
  } catch (err) {
    console.error('Erro na migration 038:', err);
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { up };
