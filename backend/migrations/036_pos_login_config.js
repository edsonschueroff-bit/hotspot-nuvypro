require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 036: Configurações de Pós-Login & Redes Sociais ===\n');

        const [cols] = await conn.execute("SHOW COLUMNS FROM empresas");
        const colNames = cols.map(c => c.Field);

        const addColIfNotExists = async (colName, colDef) => {
            if (!colNames.includes(colName)) {
                console.log(`Adicionando coluna ${colName}...`);
                await conn.execute(`ALTER TABLE empresas ADD COLUMN ${colName} ${colDef}`);
                console.log(`   -> ${colName} adicionada.`);
            } else {
                console.log(`Coluna ${colName} já existe.`);
            }
        };

        await addColIfNotExists('pos_login_tipo', "VARCHAR(30) DEFAULT 'padrao'");
        await addColIfNotExists('instagram_url', "VARCHAR(255) NULL");
        await addColIfNotExists('google_review_url', "VARCHAR(500) NULL");
        await addColIfNotExists('whatsapp_contato', "VARCHAR(30) NULL");
        await addColIfNotExists('site_url', "VARCHAR(255) NULL");

        await conn.commit();
        console.log('\n=== Migration 036 concluída com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 036:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
