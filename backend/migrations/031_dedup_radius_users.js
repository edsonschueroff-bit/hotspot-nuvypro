const db = require('../db');

async function up() {
    try {
        // Dedup em radius_users mantendo o registro mais recente
        await db.query(`
      DELETE r1 FROM radius_users r1
      INNER JOIN radius_users r2 
      ON r1.username = r2.username AND r1.id < r2.id
    `).catch(() => { });

        const [indexes] = await db.query("SHOW INDEX FROM radius_users WHERE Key_name = 'idx_radius_users_username'");
        if (indexes.length === 0) {
            await db.query("CREATE UNIQUE INDEX idx_radius_users_username ON radius_users (username)");
            console.log("[Migration 031] Índice UNIQUE em username criado na tabela radius_users.");
        }
    } catch (err) {
        console.error("[Migration 031 ⚠️]", err.message);
    }
}

up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
