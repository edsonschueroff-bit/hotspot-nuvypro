const db = require('./backend/db');

async function getPlans() {
    try {
        const [rows] = await db.query("SELECT * FROM saas_planos ORDER BY valor ASC");
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
getPlans();
