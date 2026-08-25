const { RouterOSAPI } = require("node-routeros");
const { decrypt } = require("./cryptoHelper");

async function testarConexao({ ip, usuario, senha, porta }) {
  const plainPassword = decrypt(senha);

  const conn = new RouterOSAPI({
    host: ip,
    user: usuario,
    password: plainPassword,
    port: porta || 8728,
    timeout: 5,
    keepalive: false
  });

  try {
    await conn.connect();
    await conn.close();
    return { sucesso: true };
  } catch (error) {
    return { sucesso: false, erro: error.message };
  }
}

module.exports = { testarConexao };
