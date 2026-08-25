const db = require('../db');

async function up() {
    try {
        // Garante que a coluna grupo_id existe na tabela admins
        const [[colAdmin]] = await db.query("SHOW COLUMNS FROM admins LIKE 'grupo_id'");
        if (!colAdmin) {
            await db.query("ALTER TABLE admins ADD COLUMN grupo_id INT DEFAULT NULL");
            console.log("[Migration 026] Coluna grupo_id adicionada na tabela admins.");
        }

        // Busca ou cria o grupo 'Acesso Completo' global
        const [grupos] = await db.query(
            "SELECT id FROM grupos_permissao WHERE nome = 'Acesso Completo'"
        );

        let grupoId;
        if (grupos.length === 0) {
            const [res] = await db.query(
                `INSERT INTO grupos_permissao (nome, descricao) 
         VALUES ('Acesso Completo', 'Acesso irrestrito a todos os módulos do sistema')`
            );
            grupoId = res.insertId;
            console.log("[Migration 026] Grupo 'Acesso Completo' criado.");
        } else {
            grupoId = grupos[0].id;
        }

        // Vincula admins sem grupo a esse grupoId
        await db.query(
            "UPDATE admins SET grupo_id = ? WHERE grupo_id IS NULL OR grupo_id = 0",
            [grupoId]
        );
        console.log("[Migration 026] Vínculo automático de administradores ao grupo 'Acesso Completo' concluído.");
    } catch (err) {
        console.error("[Migration 026 ⚠️]", err.message);
    }
}

up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
