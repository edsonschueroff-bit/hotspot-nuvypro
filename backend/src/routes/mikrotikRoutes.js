const express = require("express")
const router = express.Router()
const db = require("../../db")
const { testarConexao } = require("../utils/mikrotikClient");
const { resolveHotspotHtmlDir } = require("../utils/hotspotSetup");
const { obterInformacoes } = require("../controllers/mikrotikAPIController");
const { encrypt, decrypt } = require("../utils/cryptoHelper");
const { exec } = require("child_process");

// FreeRADIUS só lê NAS clients na inicialização, precisamos recarregar após mudanças
function reloadFreeRADIUS() {
  exec("systemctl restart freeradius", (err) => {
    if (err) console.error("⚠️ Erro ao reiniciar FreeRADIUS:", err.message);
    else console.log("✅ FreeRADIUS recarregado com novos NAS clients.");
  });
}
console.log("DEBUG obterInformacoes:", typeof obterInformacoes);

// Criar Mikrotik / Gateway Multi-Vendor
router.post("/", async (req, res) => {
  const {
    nome, ip, usuario, senha, porta, end_hotspot, portal_id,
    tipo, controller_url, controller_site, omadac_id, api_user, api_pass, api_key, verify_tls
  } = req.body;

  const tipoGateway = (tipo || 'mikrotik').toLowerCase();
  const hostOuUrl = ip || controller_url;

  if (!nome || (!hostOuUrl && tipoGateway === 'mikrotik')) {
    console.log("⚠️ Campos obrigatórios faltando:", req.body);
    return res.status(400).json({ message: "Nome e IP/URL do equipamento são obrigatórios." });
  }

  try {
    const targetIp = ip || controller_url || '127.0.0.1';
    const encryptedSenha = senha ? encrypt(senha) : null;
    const encryptedApiPass = api_pass ? encrypt(api_pass) : null;

    // Inserir equipamento com suporte multi-vendor
    await db.execute(
      `INSERT INTO mikrotiks (
        empresa_id, nome, ip, usuario, senha, porta, end_hotspot, portal_id,
        tipo, controller_url, controller_site, omadac_id, api_user, api_pass, api_key, verify_tls
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.empresa_id, nome, targetIp, usuario || null, encryptedSenha, porta || 8728, end_hotspot || null, portal_id || null,
        tipoGateway, controller_url || null, controller_site || 'default', omadac_id || null, api_user || null, encryptedApiPass, api_key || null, verify_tls ? 1 : 0
      ]
    );

    // Inserir NAS para RADIUS se houver IP valido
    if (tipoGateway === 'mikrotik' && ip) {
      const [nasExiste] = await db.query("SELECT id FROM nas WHERE nasname = ? AND empresa_id = ?", [ip, req.empresa_id]);
      if (nasExiste.length === 0) {
        await db.execute(
          "INSERT INTO nas (empresa_id, nasname, shortname, type, secret, description) VALUES (?, ?, ?, 'other', ?, 'RADIUS Client')",
          [req.empresa_id, ip, nome, senha || 'testing123']
        );
        reloadFreeRADIUS();
      }
    }

    console.log("✅ Equipamento e Gateway cadastrados com sucesso.");
    res.status(201).json({ message: "Equipamento cadastrado com sucesso." });

  } catch (err) {
    console.error("❌ Erro ao salvar Equipamento/Gateway:", err);
    res.status(500).json({ message: "Erro interno ao salvar equipamento." });
  }
});



router.get("/", async (req, res) => {
  try {
    if (!req.empresa_id) {
      return res.status(400).json({ message: "Empresa não identificada." });
    }
    const [rows] = await db.execute(`
      SELECT m.*, p.nome as portal_nome, p.tipo as portal_tipo
      FROM mikrotiks m LEFT JOIN portais p ON m.portal_id = p.id AND p.empresa_id = m.empresa_id
      WHERE m.empresa_id = ?
      ORDER BY m.id DESC
    `, [req.empresa_id]);

    const sanitized = rows.map(r => ({
      ...r,
      senha: r.senha ? "••••••••" : null,
      api_pass: r.api_pass ? "••••••••" : null
    }));

    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar Mikrotiks." })
  }
})


// Atualizar Mikrotik / Gateway Multi-Vendor
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { 
    nome, ip, usuario, senha, porta, end_hotspot, portal_id,
    tipo, controller_url, controller_site, omadac_id, api_user, api_pass, api_key, verify_tls
  } = req.body;

  try {
    // Buscar dados atuais antes de atualizar
    const [[mkAntigo]] = await db.execute(
      "SELECT * FROM mikrotiks WHERE id = ? AND empresa_id = ?", 
      [id, req.empresa_id]
    );
    if (!mkAntigo) return res.status(404).json({ message: "Mikrotik não encontrado." });

    // ── Tratamento Rigoroso de Senha Mascarada / Vazia ──
    let senhaFinal;
    let plainSecret;

    const isSenhaMaskedOrEmpty = !senha || 
      typeof senha !== 'string' ||
      senha.trim() === "" || 
      senha === "••••••••" || 
      senha === "********" || 
      senha.replace(/[•*]/g, "").trim() === "";

    if (isSenhaMaskedOrEmpty) {
      senhaFinal = mkAntigo.senha;
      plainSecret = decrypt(mkAntigo.senha);
    } else {
      senhaFinal = encrypt(senha.trim());
      plainSecret = senha.trim();
    }

    // ── Tratamento Rigoroso de api_pass Mascarado / Vazio ──
    let apiPassFinal;
    const isApiPassMaskedOrEmpty = !api_pass || 
      typeof api_pass !== 'string' ||
      api_pass.trim() === "" || 
      api_pass === "••••••••" || 
      api_pass === "********" || 
      api_pass.replace(/[•*]/g, "").trim() === "";

    if (isApiPassMaskedOrEmpty) {
      apiPassFinal = mkAntigo.api_pass;
    } else {
      apiPassFinal = encrypt(api_pass.trim());
    }

    const targetTipo = tipo || mkAntigo.tipo || 'mikrotik';
    const targetPortalId = portal_id !== undefined ? (portal_id || null) : mkAntigo.portal_id;
    const targetIp = ip || mkAntigo.ip;

    // Atualiza mikrotiks incluindo end_hotspot e colunas multi-vendor
    await db.execute(
      `UPDATE mikrotiks SET 
        nome = COALESCE(?, nome), 
        ip = COALESCE(?, ip), 
        usuario = COALESCE(?, usuario), 
        senha = ?, 
        porta = COALESCE(?, porta), 
        end_hotspot = ?, 
        portal_id = ?,
        tipo = ?,
        controller_url = ?,
        controller_site = COALESCE(?, 'default'),
        omadac_id = ?,
        api_user = ?,
        api_pass = ?,
        api_key = ?,
        verify_tls = ?
      WHERE id = ? AND empresa_id = ?`,
      [
        nome || null, targetIp, usuario || null, senhaFinal, porta || null, end_hotspot !== undefined ? (end_hotspot || null) : mkAntigo.end_hotspot, targetPortalId,
        targetTipo, controller_url !== undefined ? (controller_url || null) : mkAntigo.controller_url, controller_site || null, omadac_id !== undefined ? (omadac_id || null) : mkAntigo.omadac_id, api_user !== undefined ? (api_user || null) : mkAntigo.api_user, apiPassFinal, api_key !== undefined ? (api_key || null) : mkAntigo.api_key, verify_tls !== undefined ? (verify_tls ? 1 : 0) : mkAntigo.verify_tls,
        id, req.empresa_id
      ]
    );

    // Atualiza NAS no RADIUS caso seja MikroTik e tenha IP
    if (targetTipo === 'mikrotik' && targetIp) {
      await db.execute(
        "UPDATE nas SET nasname = ?, shortname = ?, secret = ? WHERE nasname = ? AND empresa_id = ?",
        [targetIp, nome || mkAntigo.nome, plainSecret || 'testing123', mkAntigo.ip, req.empresa_id]
      );
      reloadFreeRADIUS();
    }

    res.json({ message: "Atualizado com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao atualizar Mikrotik/NAS:", err);
    res.status(500).json({ message: "Erro ao atualizar Mikrotik." });
  }
});


// Deletar Mikrotik
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar IP do Mikrotik
    const [[mikrotik]] = await db.execute("SELECT ip FROM mikrotiks WHERE id = ? AND empresa_id = ?", [id, req.empresa_id]);
    if (!mikrotik) return res.status(404).json({ message: "Mikrotik não encontrado." });

    const ip = mikrotik.ip.trim();

    // Deletar Mikrotik
    await db.execute("DELETE FROM mikrotiks WHERE id = ? AND empresa_id = ?", [id, req.empresa_id]);

    // Deletar NAS correspondente da empresa
    await db.execute("DELETE FROM nas WHERE nasname = ? AND empresa_id = ?", [ip, req.empresa_id]);

    reloadFreeRADIUS();
    res.json({ message: "Removido com sucesso." });
  } catch (err) {
    console.error("❌ Erro ao deletar Mikrotik/NAS:", err);
    res.status(500).json({ message: "Erro ao deletar Mikrotik." });
  }
});

router.post("/:id/testar", async (req, res) => {
  const { id } = req.params;
  try {
    const [[mikrotik]] = await db.execute("SELECT * FROM mikrotiks WHERE id = ? AND empresa_id = ?", [id, req.empresa_id]);
    if (!mikrotik) return res.status(404).json({ message: "Equipamento não encontrado" });

    const tipo = (mikrotik.tipo || 'mikrotik').toLowerCase();
    let isOnline = false;
    let msgRetorno = "";

    if (tipo === 'omada' || tipo === 'unifi') {
      const { getGatewayDriver } = require('../gateways');
      const driver = getGatewayDriver(mikrotik);
      const testRes = await driver.testConnection();
      isOnline = testRes.ok;
      msgRetorno = testRes.msg;
    } else {
      const resultado = await testarConexao(mikrotik);
      isOnline = resultado.sucesso;
      msgRetorno = resultado.sucesso ? "Conexão bem-sucedida" : resultado.erro;
    }

    const statusNovo = isOnline ? "Online" : "Offline";
    await db.execute("UPDATE mikrotiks SET status = ? WHERE id = ?", [statusNovo, id]);

    if (isOnline) {
      res.json({ status: "online", message: msgRetorno });
    } else {
      res.status(400).json({ status: "offline", message: msgRetorno });
    }
  } catch (err) {
    console.error("Erro ao testar Equipamento:", err);
    res.status(500).json({ message: "Erro interno ao testar equipamento" });
  }
});




router.post("/:id/info", obterInformacoes);

// Escanear Mikrotik para obter interfaces, pools e IPs
router.post("/:id/scan", async (req, res) => {
  const { id } = req.params;
  try {
    const [[mikrotik]] = await db.execute("SELECT * FROM mikrotiks WHERE id = ? AND empresa_id = ?", [id, req.empresa_id]);
    if (!mikrotik) return res.status(404).json({ message: "Mikrotik não encontrado" });

    const { RouterOSAPI } = require("node-routeros");
    const conn = new RouterOSAPI({
      host: mikrotik.ip,
      user: mikrotik.usuario,
      password: decrypt(mikrotik.senha),
      port: mikrotik.porta || 8728,
      keepalive: false,
      timeout: 10000,
    });

    await conn.connect();

    // node-routeros !empty bug: Promise never resolves on empty lists
    // Use Promise.race with timeout to handle this
    const timedQuery = (path, timeoutMs = 3000) => {
      return Promise.race([
        conn.write(path).then(r => Array.isArray(r) ? r : []).catch(() => []),
        new Promise(resolve => setTimeout(() => resolve([]), timeoutMs))
      ]);
    };

    const result = { interfaces: [], pools: [], addresses: [], hotspots: [], profiles: [], radius: [] };

    // Interfaces e addresses sempre existem
    const interfaces = await timedQuery("/interface/print");
    result.interfaces = interfaces.map(i => ({ name: i.name, type: i.type, disabled: i.disabled }));

    const addresses = await timedQuery("/ip/address/print");
    result.addresses = addresses.map(a => ({ address: a.address, interface: a.interface, network: a.network }));

    // Pools, hotspot, profiles, radius podem estar vazios (!empty)
    const pools = await timedQuery("/ip/pool/print");
    result.pools = pools.map(p => ({ name: p.name, ranges: p.ranges }));

    const hotspots = await timedQuery("/ip/hotspot/print");
    result.hotspots = hotspots.map(h => ({ name: h.name, interface: h.interface, profile: h.profile }));

    const profiles = await timedQuery("/ip/hotspot/profile/print");
    result.profiles = profiles.map(p => ({ name: p.name }));

    const radiusList = await timedQuery("/radius/print");
    result.radius = radiusList.map(r => ({ address: r.address, service: r.service }));

    try { await conn.close(); } catch (e) { }

    res.json(result);
  } catch (err) {
    console.error("Erro ao escanear Mikrotik:", err.message);
    res.status(500).json({ message: "Erro ao escanear: " + err.message });
  }
});

// Enviar configuração completa de Hotspot para o Mikrotik (SSE - streaming de steps)
router.post("/:id/enviar-hotspot", async (req, res) => {
  const { id } = req.params;
  const config = req.body;

  // Configurar SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Desabilitar buffering do Nginx
  });

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const [[mikrotik]] = await db.execute(
      "SELECT * FROM mikrotiks WHERE id = ? AND empresa_id = ?",
      [id, req.empresa_id]
    );
    if (!mikrotik) {
      sendEvent({ type: "error", message: "Mikrotik não encontrado" });
      res.end();
      return;
    }

    let portal = null;
    if (mikrotik.portal_id) {
      const [[p]] = await db.execute("SELECT * FROM portais WHERE id = ?", [mikrotik.portal_id]);
      portal = p;
    }

    const [[empresa]] = await db.execute("SELECT id, slug FROM empresas WHERE id = ?", [req.empresa_id]);

    const systemDomain = req.headers.host?.replace(/:\d+$/, "") || process.env.SYSTEM_DOMAIN;
    const { configurarHotspot } = require("../utils/hotspotSetup");

    // Callback chamado a cada step - envia em tempo real via SSE
    const onStep = (step) => {
      sendEvent({ type: "step", ...step });
    };

    const result = await configurarHotspot(
      mikrotik, portal, systemDomain.replace(/:\d+$/, ""), config, empresa || {}, onStep
    );

    // Atualizar end_hotspot
    // IMPORTANTE: priorizar dnsName (DNS Name do Server Profile do hotspot) sobre o IP.
    // O MikroTik usa esse DNS Name como destino dos redirects HTTP do captive portal.
    // Quando salvamos o IP cru aqui, o cliente as vezes nao consegue logar (problema
    // de redirect HTTPS sem cert valido para o IP). Usando o DNS Name, o redirect
    // bate em algo que tem cert e roteamento certo.
    const localAddr = config.localAddress || "10.5.50.1/24";
    const gatewayIp = localAddr.split("/")[0];
    const endHotspot = (config.dnsName && config.dnsName.trim()) || gatewayIp;
    await db.execute(
      "UPDATE mikrotiks SET end_hotspot = ? WHERE id = ? AND empresa_id = ?",
      [endHotspot, id, req.empresa_id]
    );

    // Evento final
    sendEvent({
      type: "done",
      success: result.success,
      end_hotspot: endHotspot,
    });
  } catch (err) {
    console.error("Erro ao enviar hotspot:", err);
    sendEvent({ type: "error", message: "Erro interno: " + err.message });
  }

  res.end();
});

// Enviar apenas login.html para o Mikrotik (sem reconfigurar hotspot)
router.post("/:id/enviar-login", async (req, res) => {
  const { id } = req.params;
  try {
    const [[mikrotik]] = await db.execute(
      "SELECT * FROM mikrotiks WHERE id = ? AND empresa_id = ?",
      [id, req.empresa_id]
    );
    if (!mikrotik) return res.status(404).json({ message: "Mikrotik não encontrado" });

    const { RouterOSAPI } = require("node-routeros");
    const conn = new RouterOSAPI({
      host: mikrotik.ip,
      user: mikrotik.usuario,
      password: decrypt(mikrotik.senha),
      port: mikrotik.porta || 8728,
      keepalive: false,
      timeout: 20000,
    });

    await conn.connect();

    const systemDomain = req.headers.host?.replace(/:\d+$/, "") || process.env.SYSTEM_DOMAIN;
    const fetchUrl = `https://${systemDomain}/api/hotspot-login/${mikrotik.id}`;

    const safeWrite = (path, args) => {
      return Promise.race([
        conn.write(path, args).catch(e => e.message),
        new Promise(resolve => setTimeout(() => resolve("timeout"), 20000))
      ]);
    };

    // Resolve html-directory real do profile ativo (fallback: "hotspot").
    const htmlDir = await resolveHotspotHtmlDir(conn);
    const dstPath = `${htmlDir}/login.html`;
    const dstStatus = `${htmlDir}/status.html`;
    const statusFetchUrl = `https://${systemDomain}/api/hotspot-status/${mikrotik.id}`;

    let ok = false;
    let mensagem = "";

    // Tentar HTTPS para login.html
    try {
      const r = await safeWrite("/tool/fetch", [
        `=url=${fetchUrl}`,
        `=dst-path=${dstPath}`,
        "=mode=https",
        "=check-certificate=no",
      ]);
      if (r !== "timeout") {
        ok = true;
        mensagem = `login.html e status.html enviados em ${htmlDir}/ (HTTPS)`;
      }
    } catch (e) { /* tenta HTTP */ }

    // Fallback HTTP para login.html
    if (!ok) {
      try {
        const r = await safeWrite("/tool/fetch", [
          `=url=http://${systemDomain}/api/hotspot-login/${mikrotik.id}`,
          `=dst-path=${dstPath}`,
          "=mode=http",
        ]);
        if (r !== "timeout") {
          ok = true;
          mensagem = `login.html e status.html enviados em ${htmlDir}/ (HTTP)`;
        }
      } catch (e) { /* fallback manual */ }
    }

    // Enviar status.html também
    try {
      await safeWrite("/tool/fetch", [
        `=url=${statusFetchUrl}`,
        `=dst-path=${dstStatus}`,
        "=mode=https",
        "=check-certificate=no",
      ]);
    } catch (e) {
      try {
        await safeWrite("/tool/fetch", [
          `=url=http://${systemDomain}/api/hotspot-status/${mikrotik.id}`,
          `=dst-path=${dstStatus}`,
          "=mode=http",
        ]);
      } catch (e2) {}
    }

    try { await conn.close(); } catch (e) { }

    if (ok) {
      res.json({ success: true, message: mensagem });
    } else {
      const [[empresa]] = await db.execute("SELECT id, slug FROM empresas WHERE id = ?", [req.empresa_id]);
      const empresaId = empresa?.id || mikrotik.empresa_id || '';
      const empresaSlug = empresa?.slug || 'default';
      const fallbackUrl = `https://${systemDomain}/hotspot/redirect/${mikrotik.id}?mac=$(mac)&ip=$(ip)&mikrotik_id=${mikrotik.id}&empresa_id=${empresaId}&empresa=${empresaSlug}`;
      res.status(207).json({
        success: false,
        message: `Não conseguiu baixar automaticamente. Substitua ${dstPath} manualmente com redirect para: ${fallbackUrl}`
      });
    }
  } catch (err) {
    console.error("Erro ao enviar login.html:", err.message);
    res.status(500).json({ message: "Erro ao conectar: " + err.message });
  }
});

// Enviar status.html para o Mikrotik (sem reconfigurar hotspot)
router.post("/:id/enviar-status", async (req, res) => {
  const { id } = req.params;
  try {
    const [[mikrotik]] = await db.execute(
      "SELECT * FROM mikrotiks WHERE id = ? AND empresa_id = ?",
      [id, req.empresa_id]
    );
    if (!mikrotik) return res.status(404).json({ message: "Mikrotik não encontrado" });

    const { RouterOSAPI } = require("node-routeros");
    const conn = new RouterOSAPI({
      host: mikrotik.ip,
      user: mikrotik.usuario,
      password: decrypt(mikrotik.senha),
      port: mikrotik.porta || 8728,
      keepalive: false,
      timeout: 20000,
    });

    await conn.connect();

    const systemDomain = req.headers.host?.replace(/:\d+$/, "") || process.env.SYSTEM_DOMAIN;
    const fetchUrl = `https://${systemDomain}/api/hotspot-status/${mikrotik.id}`;

    const safeWrite = (path, args) => {
      return Promise.race([
        conn.write(path, args).catch(e => e.message),
        new Promise(resolve => setTimeout(() => resolve("timeout"), 20000))
      ]);
    };

    // Resolve html-directory real do profile ativo (fallback: "hotspot").
    const htmlDir = await resolveHotspotHtmlDir(conn);
    const dstPath = `${htmlDir}/status.html`;

    let ok = false;
    let mensagem = "";

    // Tentar HTTPS
    try {
      const r = await safeWrite("/tool/fetch", [
        `=url=${fetchUrl}`,
        `=dst-path=${dstPath}`,
        "=mode=https",
        "=check-certificate=no",
      ]);
      if (r !== "timeout") {
        ok = true;
        mensagem = `status.html enviado em ${dstPath} (HTTPS)`;
      }
    } catch (e) { /* tenta HTTP */ }

    // Fallback HTTP
    if (!ok) {
      try {
        const r = await safeWrite("/tool/fetch", [
          `=url=http://${systemDomain}/api/hotspot-status/${mikrotik.id}`,
          `=dst-path=${dstPath}`,
          "=mode=http",
        ]);
        if (r !== "timeout") {
          ok = true;
          mensagem = `status.html enviado em ${dstPath} (HTTP)`;
        }
      } catch (e) { /* fallback */ }
    }

    try { await conn.close(); } catch (e) { }

    if (ok) {
      res.json({ success: true, message: mensagem });
    } else {
      res.status(207).json({
        success: false,
        message: `Não conseguiu enviar ${dstPath} automaticamente. Baixe manualmente de: ${fetchUrl}`
      });
    }
  } catch (err) {
    console.error("Erro ao enviar status.html:", err.message);
    res.status(500).json({ message: "Erro ao conectar: " + err.message });
  }
});

module.exports = router
