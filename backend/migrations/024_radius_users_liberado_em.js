const db = require('../db');

async function up() {
    try {
        const [[col]] = await db.query(
            "SHOW COLUMNS FROM radius_users LIKE 'liberado_em'"
        );
        if (!col) {
            await db.query(
                "ALTER TABLE radius_users ADD COLUMN liberado_em DATETIME DEFAULT CURRENT_TIMESTAMP"
            );
            console.log("[Migration 024] Coluna liberado_em adicionada em radius_users.");
        }

        const [indexes] = await db.query("SHOW INDEX FROM radius_users WHERE Key_name = 'idx_radius_users_liberado_em'");
        if (indexes.length === 0) {
            await db.query("CREATE INDEX idx_radius_users_liberado_em ON radius_users (username, liberado_em)");
            console.log("[Migration 024] Índice idx_radius_users_liberado_em criado.");
        }
    } catch (err) {
        console.error("[Migration 024 ⚠️]", err.message);
    }
}

up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
