const db = require('../db');

async function up() {
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS portal_contexts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        mikrotik_id INT DEFAULT NULL,
        portal_id INT DEFAULT NULL,
        client_mac VARCHAR(32) NOT NULL,
        client_ip VARCHAR(45) DEFAULT NULL,
        gateway_type VARCHAR(32) DEFAULT 'mikrotik',
        redirect_url TEXT DEFAULT NULL,
        vendor_extra JSON DEFAULT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_portal_contexts_mac (client_mac, criado_em),
        INDEX idx_portal_contexts_empresa (empresa_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        console.log("[Migration 030] Tabela portal_contexts criada.");
    } catch (err) {
        console.error("[Migration 030 ⚠️]", err.message);
    }
}

up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
