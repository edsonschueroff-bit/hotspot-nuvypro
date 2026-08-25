const db = require('../db');

async function up() {
    try {
        const [[col]] = await db.query("SHOW COLUMNS FROM connection_logs LIKE 'acctuniqueid'");
        if (!col) {
            await db.query("ALTER TABLE connection_logs ADD COLUMN acctuniqueid VARCHAR(64) DEFAULT NULL");
            console.log("[Migration 025] Coluna acctuniqueid adicionada em connection_logs.");
        }

        const [[syncCol]] = await db.query("SHOW COLUMNS FROM connection_logs_sync LIKE 'last_synced_at'");
        if (!syncCol) {
            await db.query("ALTER TABLE connection_logs_sync ADD COLUMN last_synced_at DATETIME DEFAULT NULL");
            console.log("[Migration 025] Coluna last_synced_at adicionada em connection_logs_sync.");
        }

        // Dedup connection_logs by acctuniqueid se nao for nulo
        await db.query(`
      DELETE c1 FROM connection_logs c1
      INNER JOIN connection_logs c2 
      ON c1.acctuniqueid = c2.acctuniqueid AND c1.id < c2.id
      WHERE c1.acctuniqueid IS NOT NULL AND c1.acctuniqueid != ''
    `).catch(() => { });

        const [indexes] = await db.query("SHOW INDEX FROM connection_logs WHERE Key_name = 'idx_connection_logs_acctuniqueid'");
        if (indexes.length === 0) {
            await db.query("CREATE UNIQUE INDEX idx_connection_logs_acctuniqueid ON connection_logs (acctuniqueid)");
            console.log("[Migration 025] Índice UNIQUE acctuniqueid criado em connection_logs.");
        }
    } catch (err) {
        console.error("[Migration 025 ⚠️]", err.message);
    }
}

up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
