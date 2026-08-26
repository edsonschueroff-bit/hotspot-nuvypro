const db = require("../../db");

exports.login = async (req, res) => {
  const { username, password, mikrotik_id } = req.body;

  if (!username || !password || !mikrotik_id) {
    return res.status(400).json({ message: "Usuário, senha ou mikrotik não informados" });
  }

  try {
    // Busca a senha do usuário na tabela radcheck
    const [[user]] = await db.execute(
      "SELECT value FROM radcheck WHERE username = ? AND attribute = 'Cleartext-Password'",
      [username]
    );

    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    if (user.value !== password) {
      return res.status(401).json({ message: "Senha incorreta" });
    }

    // Nao limpar radacct aqui: o FreeRADIUS ja tem delete_stale_sessions=yes,
    // e apagar radacct reduziria o contador 'totalcounter' (reset=never),
    // permitindo reuso infinito do mesmo plano. Sessoes travadas sao
    // resolvidas pelo proprio FreeRADIUS ou pela re-autenticacao.

    // Pega o dominio do gateway (MikroTik) para redirecionamento
    const [[mk]] = await db.query(
      "SELECT ip, end_hotspot FROM mikrotiks WHERE id = ?",
      [mikrotik_id]
    );

    const clientIp = req.body.ip || req.query.ip;
    const gateway = mk?.end_hotspot || (clientIp && typeof clientIp === 'string' && clientIp.includes('.') ? clientIp.replace(/\.\d+$/, '.1') : '10.5.50.1');

    res.json({ message: "Autenticado com sucesso", gateway, username });

  } catch (err) {
    console.error("Erro no login-portal:", err);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
};
