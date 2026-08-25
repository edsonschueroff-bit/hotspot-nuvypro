const db = require('../db');

async function up() {
    try {
        const colsToAdd = [
            { name: "tipo", type: "VARCHAR(32) DEFAULT 'mikrotik'" },
            { name: "controller_url", type: "VARCHAR(255) DEFAULT NULL" },
            { name: "controller_site", type: "VARCHAR(64) DEFAULT 'default'" },
            { name: "omadac_id", type: "VARCHAR(128) DEFAULT NULL" },
            { name: "api_user", type: "VARCHAR(128) DEFAULT NULL" },
            { name: "api_pass", type: "VARCHAR(255) DEFAULT NULL" },
            { name: "api_key", type: "TEXT DEFAULT NULL" },
            { name: "verify_tls", type: "TINYINT(1) DEFAULT 0" }
        ];

        for (const col of colsToAdd) {
            const [[exists]] = await db.query(`SHOW COLUMNS FROM mikrotiks LIKE '${col.name}'`);
            if (!exists) {
                await db.query(`ALTER TABLE mikrotiks ADD COLUMN ${col.name} ${col.type}`);
                console.log(`[Migration 027] Coluna ${col.name} adicionada em mikrotiks.`);
            }
        }
    } catch (err) {
        console.error("[Migration 027 ⚠️]", err.message);
    }
}

up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
