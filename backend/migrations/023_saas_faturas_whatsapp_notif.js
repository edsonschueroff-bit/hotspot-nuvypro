require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function colExists(conn, table, col) {
    const [rows] = await conn.execute(
        "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [table, col]
    );
    return rows[0].cnt > 0;
}

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 023: Tabela saas_faturas (Notificações Preventivas WhatsApp PIX) ===\n');

        const colsToAdd = [
            { name: 'notificado_3d_em', type: 'DATETIME NULL AFTER whatsapp_notificado_em' },
            { name: 'notificado_vencimento_em', type: 'DATETIME NULL AFTER notificado_3d_em' }
        ];

        for (const col of colsToAdd) {
            const exists = await colExists(conn, 'saas_faturas', col.name);
            if (!exists) {
                await conn.execute(`ALTER TABLE saas_faturas ADD COLUMN ${col.name} ${col.type}`);
                console.log(`   -> Coluna ${col.name} adicionada com sucesso.`);
            } else {
                console.log(`   -> Coluna ${col.name} já existe.`);
            }
        }

        await conn.commit();
        console.log('\n=== Migration 023 concluída com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 023:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
