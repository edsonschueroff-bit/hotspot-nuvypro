require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 021: Cadastro Completo de Empresas ===\n');

        const [cols] = await conn.execute(`SHOW COLUMNS FROM empresas`);
        const colNames = cols.map(c => c.Field);

        const newCols = [
            { name: 'razao_social', type: 'VARCHAR(255) NULL' },
            { name: 'inscricao_estadual', type: 'VARCHAR(50) NULL' },
            { name: 'inscricao_municipal', type: 'VARCHAR(50) NULL' },
            { name: 'responsavel_nome', type: 'VARCHAR(255) NULL' },
            { name: 'responsavel_cargo', type: 'VARCHAR(100) NULL' },
            { name: 'cep', type: 'VARCHAR(20) NULL' },
            { name: 'logradouro', type: 'VARCHAR(255) NULL' },
            { name: 'numero', type: 'VARCHAR(20) NULL' },
            { name: 'complemento', type: 'VARCHAR(100) NULL' },
            { name: 'bairro', type: 'VARCHAR(100) NULL' },
            { name: 'cidade', type: 'VARCHAR(100) NULL' },
            { name: 'uf', type: 'VARCHAR(2) NULL' },
            { name: 'pix_chave', type: 'VARCHAR(255) NULL' }
        ];

        for (const c of newCols) {
            if (!colNames.includes(c.name)) {
                console.log(`Adicionando coluna ${c.name}...`);
                await conn.execute(`ALTER TABLE empresas ADD COLUMN ${c.name} ${c.type}`);
            }
        }

        await conn.commit();
        console.log('\n=== Migration 021 concluida com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 021:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
