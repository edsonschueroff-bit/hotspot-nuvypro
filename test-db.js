const db = require('./backend/db');

async function check() {
    try {
        const [rows] = await db.query("SELECT id, nome, matriz_id, ativo, status_financeiro FROM empresas");
        console.log("Empresas:", rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
