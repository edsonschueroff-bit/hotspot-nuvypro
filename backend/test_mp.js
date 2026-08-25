const db = require('./db');
const axios = require('axios');

async function test() {
    try {
        const [[row]] = await db.execute("SELECT config_json FROM empresa_configs WHERE config_type = 'mercadopago' ORDER BY id DESC LIMIT 1");
        if (!row) {
            console.log("Nenhuma configuracao do Mercado Pago salva!");
            return process.exit(1);
        }
        const config = typeof row.config_json === 'string' ? JSON.parse(row.config_json) : row.config_json;
        if (!config.access_token) {
            console.log("Access Token ausente!");
            return process.exit(1);
        }

        console.log("Fazendo chamada para o Mercado Pago...");
        const response = await axios.get("https://api.mercadopago.com/users/me", {
            headers: { Authorization: `Bearer ${config.access_token}` }
        });
        console.log("SUCESSO!!!");
        console.log("ID do Usuário:", response.data.id);
        console.log("Nickname:", response.data.nickname);
        console.log("E-mail MP:", response.data.email);
        console.log("Status:", response.data.site_status);
    } catch (e) {
        console.log("ERRO AO TESTAR:");
        if (e.response && e.response.data) {
            console.log(e.response.data.message || e.response.data);
        } else {
            console.log(e.message);
        }
    }
    process.exit(0);
}
test();
