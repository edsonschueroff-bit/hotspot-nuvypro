const db = require('../db');

async function up() {
    try {
        await db.query("ALTER TABLE mikrotiks MODIFY COLUMN usuario VARCHAR(128) DEFAULT NULL");
        await db.query("ALTER TABLE mikrotiks MODIFY COLUMN senha VARCHAR(255) DEFAULT NULL");
        console.log("[Migration 028] Colunas usuario e senha ajustadas para NULLABLE em mikrotiks.");
    } catch (err) {
        console.error("[Migration 028 ⚠️]", err.message);
    }
}

up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
