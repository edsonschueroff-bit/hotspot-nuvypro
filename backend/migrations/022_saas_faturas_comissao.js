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

        console.log('=== Migration 022: Tabela saas_faturas (Comissionamento & Revenue Share) ===\n');

        // Adicionar colunas de desmembramento de comissão em saas_faturas
        const colsToAdd = [
            { name: 'valor_base', type: 'DECIMAL(10,2) DEFAULT 0.00 AFTER valor' },
            { name: 'total_vendas', type: 'DECIMAL(10,2) DEFAULT 0.00 AFTER valor_base' },
            { name: 'comissao_porcentagem', type: 'DECIMAL(5,2) DEFAULT 0.00 AFTER total_vendas' },
            { name: 'valor_comissao', type: 'DECIMAL(10,2) DEFAULT 0.00 AFTER comissao_porcentagem' }
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
        console.log('\n=== Migration 022 concluída com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 022:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
