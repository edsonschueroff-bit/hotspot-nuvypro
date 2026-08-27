const db = require("../../db");

exports.login = async (req, res) => {
  const { username, password, mikrotik_id } = req.body;

  if (!username || !mikrotik_id) {
    return res.status(400).json({ message: "Usuário ou mikrotik não informados" });
  }

  try {
    const rawUser = String(username).trim().toUpperCase();
    const noHyphen = rawUser.replace(/[^A-Z0-9]/g, "");
    const rawPass = password ? String(password).trim() : rawUser;
    const noHyphenPass = rawPass.replace(/[^A-Z0-9]/g, "");

    // Busca o usuário na tabela radcheck aceitando variações (com ou sem hífen, com ou sem prefixo WIFI-)
    const [matches] = await db.query(
      `SELECT username, value FROM radcheck 
       WHERE (
         username = ? 
         OR REPLACE(username, '-', '') = ? 
         OR username = CONCAT('WIFI-', ?)
         OR username LIKE CONCAT('%-', ?)
       ) AND attribute = 'Cleartext-Password'
       LIMIT 1`,
      [rawUser, noHyphen, noHyphen, noHyphen]
    );

    const user = matches[0];

    if (!user) {
      return res.status(401).json({ message: "Voucher ou usuário não encontrado" });
    }

    // Valida a senha (aceita senha exata ou variação sem hífen)
    const userPass = String(user.value).toUpperCase();
    const isPassValid = user.value === password || 
                        userPass === rawPass.toUpperCase() || 
                        userPass.replace(/-/g, '') === noHyphenPass.toUpperCase() ||
                        user.username === user.value; // vouchers usam codigo como senha

    if (!isPassValid) {
      return res.status(401).json({ message: "Senha incorreta" });
    }

    const resolvedUsername = user.username;

    // Se for um voucher da tabela vouchers, marca imediatamente como utilizado
    try {
      await db.query(
        `UPDATE vouchers 
         SET status = 'utilizado', primeiro_uso_em = COALESCE(primeiro_uso_em, NOW())
         WHERE (codigo = ? OR REPLACE(codigo, '-', '') = ?) AND status = 'disponivel'`,
        [resolvedUsername, noHyphen]
      );
    } catch (vErr) {
      console.warn("[login-portal] Aviso ao marcar voucher como utilizado:", vErr.message);
    }

    // Pega o domínio do gateway (MikroTik) para redirecionamento
    const [[mk]] = await db.query(
      "SELECT ip, end_hotspot FROM mikrotiks WHERE id = ?",
      [mikrotik_id]
    );

    const clientIp = req.body.ip || req.query.ip;
    const gateway = mk?.end_hotspot || (clientIp && typeof clientIp === 'string' && clientIp.includes('.') ? clientIp.replace(/\.\d+$/, '.1') : '10.5.50.1');

    res.json({ message: "Autenticado com sucesso", gateway, username: resolvedUsername });

  } catch (err) {
    console.error("Erro no login-portal:", err);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
};
