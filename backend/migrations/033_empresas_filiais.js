require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 033: Multi-Filiais & Gestão de Redes ===\n');

        // 1. Adicionar colunas matriz_id, tipo_unidade, cidade, estado, endereco na tabela empresas
        console.log('1. Adicionando colunas de hierarquia de filiais em empresas...');
        
        const colunas = [
            { name: 'matriz_id', type: 'INT NULL DEFAULT NULL' },
            { name: 'tipo_unidade', type: "ENUM('matriz', 'filial', 'independente') DEFAULT 'independente'" },
            { name: 'cidade', type: 'VARCHAR(100) NULL DEFAULT NULL' },
            { name: 'estado', type: 'VARCHAR(2) NULL DEFAULT NULL' },
            { name: 'endereco', type: 'VARCHAR(255) NULL DEFAULT NULL' },
            { name: 'responsavel_nome', type: 'VARCHAR(120) NULL DEFAULT NULL' }
        ];

        for (const col of colunas) {
            const [check] = await conn.execute(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'empresas' 
                  AND COLUMN_NAME = ?
            `, [col.name]);

            if (check.length === 0) {
                await conn.execute(`ALTER TABLE empresas ADD COLUMN ${col.name} ${col.type}`);
                console.log(`   -> Coluna ${col.name} adicionada.`);
            } else {
                console.log(`   -> Coluna ${col.name} já existe.`);
            }
        }

        // 2. Adicionar Foreign Key e Index em matriz_id se não existirem
        const [fkCheck] = await conn.execute(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'empresas' 
              AND CONSTRAINT_NAME = 'fk_empresas_matriz'
        `);

        if (fkCheck.length === 0) {
            await conn.execute(`
                ALTER TABLE empresas 
                ADD CONSTRAINT fk_empresas_matriz 
                FOREIGN KEY (matriz_id) REFERENCES empresas(id) ON DELETE SET NULL
            `);
            console.log('   -> FK fk_empresas_matriz criada.');
        }

        await conn.commit();
        console.log('\n=== Migration 033 concluída com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 033:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
