const db = require('../db');

async function up() {
    try {
        const [[exists]] = await db.query("SHOW COLUMNS FROM leads LIKE 'lgpd_termo'");
        if (!exists) {
            await db.query("ALTER TABLE leads ADD COLUMN lgpd_termo TEXT DEFAULT NULL");
            console.log("[Migration 029] Coluna lgpd_termo adicionada em leads.");
        }
    } catch (err) {
        console.error("[Migration 029 ⚠️]", err.message);
    }
}

up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
