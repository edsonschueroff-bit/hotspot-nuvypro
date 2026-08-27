const db = require("../../db");
const axios = require("axios");

// Helper para obter plano de acesso da empresa (LGPD ou primeiro plano ativo)
async function obterPlanoSocial(empresaId, portalId) {
  let plano = null;

  // 1. Se o portal tiver plano específico configurado
  if (portalId) {
    const [[portal]] = await db.query(
      `SELECT configuracoes FROM portais WHERE id = ? AND empresa_id = ?`,
      [portalId, empresaId]
    );
    if (portal?.configuracoes) {
      try {
        const cfg = JSON.parse(portal.configuracoes);
        if (cfg.plano_id) {
          const [[p]] = await db.query(
            `SELECT p.id, p.duracao_minutos, p.velocidade_down, p.velocidade_up, p.mikrotik_id, m.end_hotspot, m.ip
             FROM planos p
             JOIN mikrotiks m ON p.mikrotik_id = m.id
             WHERE p.id = ? AND p.empresa_id = ?`,
            [cfg.plano_id, empresaId]
          );
          if (p) plano = p;
        }
      } catch (e) { }
    }
  }

  // 2. Busca plano chamado 'LGPD' ou 'Social'
  if (!plano) {
    const [[p]] = await db.query(
      `SELECT p.id, p.duracao_minutos, p.velocidade_down, p.velocidade_up, p.mikrotik_id, m.end_hotspot, m.ip
       FROM planos p
       JOIN mikrotiks m ON p.mikrotik_id = m.id
       WHERE (p.nome = 'LGPD' OR p.nome = 'Social' OR p.nome LIKE '%Gratis%' OR p.nome LIKE '%Grátis%')
         AND p.empresa_id = ?
       LIMIT 1`,
      [empresaId]
    );
    if (p) plano = p;
  }

  // 3. Fallback: qualquer plano ativo da empresa
  if (!plano) {
    const [[p]] = await db.query(
      `SELECT p.id, p.duracao_minutos, p.velocidade_down, p.velocidade_up, p.mikrotik_id, m.end_hotspot, m.ip
       FROM planos p
       JOIN mikrotiks m ON p.mikrotik_id = m.id
       WHERE p.empresa_id = ? AND p.ativo = 1
       LIMIT 1`,
      [empresaId]
    );
    if (p) plano = p;
  }

  return plano;
}

// Provisiona o usuário no FreeRADIUS
async function provisionarRadius(username, senha, plano, empresaId) {
  // Limpa registros anteriores para renovar tempo
  await db.query("DELETE FROM radcheck WHERE username = ?", [username]);
  await db.query("DELETE FROM radreply WHERE username = ?", [username]);
  await db.query("DELETE FROM radusergroup WHERE username = ?", [username]);
  await db.query("DELETE FROM radacct WHERE username = ?", [username]);

  const rateLimit = `${plano.velocidade_up || 2}M/${plano.velocidade_down || 5}M`;
  const duracaoMinutos = plano.duracao_minutos || 60;
  const tempoSegundos = duracaoMinutos * 60;

  const { formatRadiusExpirationDate } = require("../utils/radiusDateHelper");

  const checkValues = [
    [username, 'Cleartext-Password', ':=', senha],
    [username, 'Simultaneous-Use', ':=', String(plano.shared_users || 1)],
  ];

  if (plano.tipo_validade === 'acumulado') {
    checkValues.push([username, 'Max-All-Session', ':=', String(tempoSegundos)]);
  } else {
    const dataExpiracao = new Date(Date.now() + tempoSegundos * 1000);
    const expirationStr = formatRadiusExpirationDate(dataExpiracao);
    checkValues.push([username, 'Expiration', ':=', expirationStr]);
  }

  // radcheck
  await db.query(
    `INSERT INTO radcheck (username, attribute, op, value)
     VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)`,
    checkValues.flat()
  );

  // radreply
  await db.query(
    `INSERT INTO radreply (username, attribute, op, value)
     VALUES (?, 'Mikrotik-Rate-Limit', ':=', ?),
            (?, 'Session-Timeout', ':=', ?),
            (?, 'Acct-Interim-Interval', ':=', '120')`,
    [username, rateLimit, username, String(tempoSegundos), username]
  );

  // radusergroup
  await db.query(
    "INSERT INTO radusergroup (username, groupname) VALUES (?, ?)",
    [username, plano.id]
  );

  // radius_users
  await db.query(
    `INSERT INTO radius_users (empresa_id, username, plano_id, nas_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE plano_id = VALUES(plano_id), nas_id = VALUES(nas_id), empresa_id = VALUES(empresa_id)`,
    [empresaId, username, plano.id, plano.mikrotik_id]
  );
}

// ── GET CONFIGURAÇÃO OAUTH PÚBLICA (Para o Portal) ──
exports.getPublicOAuthConfig = async (req, res) => {
  try {
    const { empresa_id, mikrotik_id } = req.query;
    let resolvedEmpresaId = empresa_id;

    if (!resolvedEmpresaId && mikrotik_id) {
      const [[mk]] = await db.query("SELECT empresa_id FROM mikrotiks WHERE id = ?", [mikrotik_id]);
      resolvedEmpresaId = mk?.empresa_id;
    }

    let config = {
      google_enabled: true,
      google_client_id: process.env.GOOGLE_CLIENT_ID || "332857217983-demo.apps.googleusercontent.com",
      facebook_enabled: true,
      facebook_app_id: process.env.FACEBOOK_APP_ID || ""
    };

    if (resolvedEmpresaId) {
      const [[empConfig]] = await db.query(
        `SELECT config_json, ativo FROM empresa_configs WHERE empresa_id = ? AND config_type = 'oauth' LIMIT 1`,
        [resolvedEmpresaId]
      );
      if (empConfig?.config_json) {
        try {
          const parsed = typeof empConfig.config_json === "string"
            ? JSON.parse(empConfig.config_json)
            : empConfig.config_json;

          config = {
            google_enabled: parsed.google_enabled ?? true,
            google_client_id: parsed.google_client_id || config.google_client_id,
            facebook_enabled: parsed.facebook_enabled ?? true,
            facebook_app_id: parsed.facebook_app_id || config.facebook_app_id
          };
        } catch (e) { }
      }
    }

    res.json(config);
  } catch (err) {
    console.error("Erro ao obter public oauth config:", err);
    res.status(500).json({ message: "Erro ao obter configurações" });
  }
};

// ── AUTENTICAÇÃO GOOGLE NO CAPTIVE PORTAL ──
exports.loginGoogle = async (req, res) => {
  try {
    const { credential, accessToken, userInfo, mac, ip, mikrotik_id, portal_id } = req.body;

    if (!mac || !ip) {
      return res.status(400).json({ message: "Endereço MAC e IP são obrigatórios" });
    }

    let googleData = userInfo || {};

    // Se veio credential (JWT do Google One Tap), valida na Google
    if (credential) {
      try {
        const verifyRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        googleData = {
          name: verifyRes.data.name,
          email: verifyRes.data.email,
          picture: verifyRes.data.picture,
          sub: verifyRes.data.sub
        };
      } catch (gErr) {
        console.warn("Aviso ao validar token Google online:", gErr.message);
      }
    } else if (accessToken) {
      try {
        const verifyRes = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        googleData = {
          name: verifyRes.data.name,
          email: verifyRes.data.email,
          picture: verifyRes.data.picture,
          sub: verifyRes.data.sub
        };
      } catch (gErr) {
        console.warn("Aviso ao validar access token Google online:", gErr.message);
      }
    }

    const nome = googleData.name || "Visitante Google";
    const email = googleData.email || null;
    const telefone = googleData.telefone || null;

    // Resolve empresa
    let empresaId = 1;
    if (mikrotik_id) {
      const [[mk]] = await db.query("SELECT empresa_id FROM mikrotiks WHERE id = ?", [mikrotik_id]);
      if (mk?.empresa_id) empresaId = mk.empresa_id;
    }

    // Grava/Atualiza Lead
    await db.execute(
      `INSERT INTO leads (empresa_id, nome, email, telefone, mac, ip, origem, lgpd_aceite, lgpd_aceite_em, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, 'social_google', 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         nome = COALESCE(VALUES(nome), nome),
         email = COALESCE(VALUES(email), email),
         telefone = COALESCE(VALUES(telefone), telefone),
         ip = VALUES(ip),
         origem = 'social_google'`,
      [empresaId, nome, email, telefone, mac, ip]
    );

    // Obtém plano e provisiona RADIUS
    const plano = await obterPlanoSocial(empresaId, portal_id);
    if (!plano) {
      return res.status(404).json({ message: "Nenhum plano de acesso disponível para a empresa" });
    }

    const username = mac;
    const senha = mac;

    await provisionarRadius(username, senha, plano, empresaId);

    // Identifica gateway do MikroTik (nunca usar IP do VPN 10.8.0.x ou IP do próprio cliente)
    const [[mkData]] = await db.query(
      "SELECT ip, end_hotspot FROM mikrotiks WHERE id = ? OR empresa_id = ? LIMIT 1",
      [mikrotik_id || 0, empresaId]
    );
    const gateway = mkData?.end_hotspot || (ip && typeof ip === 'string' && ip.includes('.') ? ip.replace(/\.\d+$/, '.1') : '10.5.50.1');

    const emailService = require('../services/emailService');
    emailService.checarEDispararEmailWifi(email, nome, empresaId, portal_id).catch(err => console.warn('[loginGoogle Wi-Fi Email ⚠️]', err.message));

    res.json({
      success: true,
      message: "Login com Google realizado com sucesso!",
      gateway,
      username,
      password: senha,
      user: { nome, email, telefone }
    });
  } catch (err) {
    console.error("Erro no loginGoogle:", err);
    res.status(500).json({ message: "Erro ao processar autenticação Google" });
  }
};

// ── AUTENTICAÇÃO FACEBOOK NO CAPTIVE PORTAL ──
exports.loginFacebook = async (req, res) => {
  try {
    const { accessToken, userInfo, mac, ip, mikrotik_id, portal_id } = req.body;

    if (!mac || !ip) {
      return res.status(400).json({ message: "Endereço MAC e IP são obrigatórios" });
    }

    let fbData = userInfo || {};

    if (accessToken) {
      try {
        const verifyRes = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`);
        fbData = {
          name: verifyRes.data.name,
          email: verifyRes.data.email,
          id: verifyRes.data.id
        };
      } catch (fbErr) {
        console.warn("Aviso ao validar token Facebook online:", fbErr.message);
      }
    }

    const nome = fbData.name || "Visitante Facebook";
    const email = fbData.email || null;
    const telefone = fbData.telefone || null;

    let empresaId = 1;
    if (mikrotik_id) {
      const [[mk]] = await db.query("SELECT empresa_id FROM mikrotiks WHERE id = ?", [mikrotik_id]);
      if (mk?.empresa_id) empresaId = mk.empresa_id;
    }

    // Grava/Atualiza Lead
    await db.execute(
      `INSERT INTO leads (empresa_id, nome, email, telefone, mac, ip, origem, lgpd_aceite, lgpd_aceite_em, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, 'social_facebook', 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         nome = COALESCE(VALUES(nome), nome),
         email = COALESCE(VALUES(email), email),
         telefone = COALESCE(VALUES(telefone), telefone),
         ip = VALUES(ip),
         origem = 'social_facebook'`,
      [empresaId, nome, email, telefone, mac, ip]
    );

    const plano = await obterPlanoSocial(empresaId, portal_id);
    if (!plano) {
      return res.status(404).json({ message: "Nenhum plano de acesso disponível para a empresa" });
    }

    const username = mac;
    const senha = mac;

    await provisionarRadius(username, senha, plano, empresaId);

    const [[mkData]] = await db.query(
      "SELECT ip, end_hotspot FROM mikrotiks WHERE id = ? OR empresa_id = ? LIMIT 1",
      [mikrotik_id || 0, empresaId]
    );
    const gateway = mkData?.end_hotspot || mkData?.ip || "192.168.88.1";

    const emailService = require('../services/emailService');
    emailService.checarEDispararEmailWifi(email, nome, empresaId, portal_id).catch(err => console.warn('[loginFacebook Wi-Fi Email ⚠️]', err.message));

    res.json({
      success: true,
      message: "Login com Facebook realizado com sucesso!",
      gateway,
      username,
      password: senha,
      user: { nome, email, telefone }
    });
  } catch (err) {
    console.error("Erro no loginFacebook:", err);
    res.status(500).json({ message: "Erro ao processar autenticação Facebook" });
  }
};

// ── GET OAUTH CONFIG ADMIN ──
exports.getAdminOAuthConfig = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const [[configRow]] = await db.query(
      "SELECT config_json, ativo FROM empresa_configs WHERE empresa_id = ? AND config_type = 'oauth' LIMIT 1",
      [empresaId]
    );

    let config = {
      google_enabled: true,
      google_client_id: "",
      google_client_secret: "",
      facebook_enabled: true,
      facebook_app_id: "",
      facebook_app_secret: "",
      ativo: true
    };

    if (configRow?.config_json) {
      try {
        const parsed = typeof configRow.config_json === "string"
          ? JSON.parse(configRow.config_json)
          : configRow.config_json;
        config = { ...config, ...parsed, ativo: !!configRow.ativo };
      } catch (e) { }
    }

    res.json(config);
  } catch (err) {
    console.error("Erro ao carregar configurações OAuth admin:", err);
    res.status(500).json({ message: "Erro ao carregar configurações OAuth" });
  }
};

// ── SAVE OAUTH CONFIG ADMIN ──
exports.saveAdminOAuthConfig = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const {
      google_enabled = true,
      google_client_id = "",
      google_client_secret = "",
      facebook_enabled = true,
      facebook_app_id = "",
      facebook_app_secret = "",
      ativo = true
    } = req.body;

    const configData = {
      google_enabled: !!google_enabled,
      google_client_id: google_client_id.trim(),
      google_client_secret: google_client_secret.trim(),
      facebook_enabled: !!facebook_enabled,
      facebook_app_id: facebook_app_id.trim(),
      facebook_app_secret: facebook_app_secret.trim()
    };

    const configJson = JSON.stringify(configData);

    await db.execute(
      `INSERT INTO empresa_configs (empresa_id, config_type, config_json, ativo)
       VALUES (?, 'oauth', ?, ?)
       ON DUPLICATE KEY UPDATE
         config_json = VALUES(config_json),
         ativo = VALUES(ativo)`,
      [empresaId, configJson, ativo ? 1 : 0]
    );

    res.json({ success: true, message: "Configurações de Login Social salvas com sucesso!" });
  } catch (err) {
    console.error("Erro ao salvar configurações OAuth admin:", err);
    res.status(500).json({ message: "Erro ao salvar configurações OAuth" });
  }
};
