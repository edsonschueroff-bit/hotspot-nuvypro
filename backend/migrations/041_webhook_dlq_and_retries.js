const db = require('../db');

async function migrate() {
  console.log('=== Migration 041: Webhook Outbound DLQ & Resiliência ===\n');

  try {
    const [cols] = await db.query('SHOW COLUMNS FROM empresa_webhook_logs');
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('proxima_tentativa_em')) {
      await db.query('ALTER TABLE empresa_webhook_logs ADD COLUMN proxima_tentativa_em DATETIME NULL AFTER tentativas');
      console.log("✅ Coluna 'proxima_tentativa_em' adicionada em empresa_webhook_logs.");
    }

    if (!colNames.includes('status_entrega')) {
      await db.query("ALTER TABLE empresa_webhook_logs ADD COLUMN status_entrega ENUM('pendente', 'sucesso', 'falha_definitiva') DEFAULT 'sucesso' AFTER proxima_tentativa_em");
      console.log("✅ Coluna 'status_entrega' adicionada em empresa_webhook_logs.");
    }

    // Criar índice para o worker de retry
    const [indexes] = await db.query("SHOW INDEX FROM empresa_webhook_logs WHERE Key_name = 'idx_webhook_retry_status'");
    if (indexes.length === 0) {
      await db.query("ALTER TABLE empresa_webhook_logs ADD INDEX idx_webhook_retry_status (status_entrega, proxima_tentativa_em)");
      console.log("✅ Índice 'idx_webhook_retry_status' criado com sucesso.");
    }

    console.log('\n🎉 Migration 041 concluída com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migration 041:', err);
    process.exit(1);
  }
}

migrate();
