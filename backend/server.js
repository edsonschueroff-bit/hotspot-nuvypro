require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const app = express()

// Prevenir crash do processo por erros não tratados do node-routeros (!empty)
process.on('uncaughtException', (err) => {
  if (err.errno === 'UNKNOWNREPLY' || (err.message && err.message.includes('!empty'))) {
    console.warn('RouterOS !empty reply handled (non-fatal)');
    return;
  }
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Middlewares
const auth = require('./src/middleware/auth')
const tenant = require('./src/middleware/tenant')

// Rotas
const authRoutes = require('./src/routes/authRoutes')
const planRoutes = require('./src/routes/planRoutes')
const adminRoutes = require("./routes/admin")
const mikrotikRoutes = require("./src/routes/mikrotikRoutes");
const efiRoutes = require("./src/routes/efiRoutes");
const mercadoPagoRoutes = require("./src/routes/mercadoPagoRoutes");
const planPublicRoutes = require("./src/routes/planPublicRoutes");
const pagamentoRoutes = require("./src/routes/pagamentoRoutes");
const radiusRoutes = require('./src/routes/radiusRoutes');
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const npsRoutes = require("./src/routes/npsRoutes");
const lgpdRoutes = require("./src/routes/lgpdRoutes");
const whatsappRoutes = require("./src/routes/whatsappRoutes");
const authTempRoutes = require("./src/routes/authTempRoutes");
const limpezaRoutes = require("./src/routes/limpezaRoutes");
const radiusLogsRoutes = require("./src/routes/radiusLogsRoutes");
const adminUserRoutes = require("./src/routes/adminUserRoutes");
const wireguardRoutes = require("./src/routes/wireguardRoutes");
const portalRoutes = require("./src/routes/portalRoutes");
const portalTemplateRoutes = require("./src/routes/portalTemplateRoutes");
const campanhasRoutes = require("./src/routes/campanhasRoutes");
const campanhasPublicRoutes = require("./src/routes/campanhasPublicRoutes");
const socialAuthRoutes = require("./src/routes/socialAuthRoutes");
const cuponsRoutes = require("./src/routes/cuponsRoutes");
const leadRoutes = require("./src/routes/leadRoutes");
const crmRoutes = require("./src/routes/crmRoutes");
const complianceRoutes = require("./src/routes/complianceRoutes");
const empresaRoutes = require("./src/routes/empresaRoutes");
const empresaConfigRoutes = require("./src/routes/empresaConfigRoutes");
const registroRoutes = require("./src/routes/registroRoutes");
const grupoPermissaoRoutes = require("./src/routes/grupoPermissaoRoutes");
const loginPortalRoutes = require("./src/routes/loginPortalRoutes");
const systemBackupRoutes = require("./src/routes/systemBackupRoutes");
const systemUpdateRoutes = require("./src/routes/systemUpdateRoutes");
const logsRoutes = require("./src/routes/logsRoutes");
const webhookOutboundRoutes = require("./src/routes/webhookOutboundRoutes");
const filialRoutes = require("./src/routes/filialRoutes");
const voucherRoutes = require("./src/routes/voucherRoutes");
const cardapioRoutes = require("./src/routes/cardapioRoutes");
const fidelidadeRoutes = require("./src/routes/fidelidadeRoutes");
const lgpdTitularRoutes = require("./src/routes/lgpdTitularRoutes");
const saasCartaoRoutes = require("./src/routes/saasCartaoRoutes");
const financeiroRoutes = require("./src/routes/financeiroRoutes");
const db = require("./db");

// Rotas exclusivas do servidor principal (OTA updates) - não existem nos servidores de alunos
const fs = require('fs');
const updatePublishRoutes = fs.existsSync(__dirname + '/src/routes/updatePublishRoutes.js') ? require("./src/routes/updatePublishRoutes") : null;
const updateCheckRoutes = fs.existsSync(__dirname + '/src/routes/updateCheckRoutes.js') ? require("./src/routes/updateCheckRoutes") : null;

const helmet = require('helmet');
const { 
  loginLimiter, 
  registroLimiter, 
  publicApiLimiter, 
  pagamentoLimiter, 
  alertasLimiter 
} = require('./src/middleware/rateLimiters');

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS com Whitelist restritiva e suporte a Captive Portal Gateways
const allowedOrigins = [
  'https://hotspot.nuvycore.online',
  'https://glpi.forumtelecom.com.br',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];
if (process.env.SYSTEM_DOMAIN) {
  allowedOrigins.push(`https://${process.env.SYSTEM_DOMAIN}`);
  allowedOrigins.push(`http://${process.env.SYSTEM_DOMAIN}`);
}

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.some(o => origin === o || origin.endsWith('.nuvycore.online') || origin.endsWith('.forumtelecom.com.br'))) {
    return true;
  }
  // Permitir origens de gateways/roteadores locais em captive portals (ex: http://10.5.50.1, http://192.168.88.1)
  const isLocalGateway = /^https?:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
  if (isLocalGateway) return true;

  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204
}));

app.use(express.json())

// Aplicar rate limiters nas rotas sensíveis e públicas
app.use('/api/admin/login', loginLimiter);
app.use('/api/auth/solicitar-reset-senha', loginLimiter);
app.use('/api/registro', registroLimiter);
app.use('/api/pagamentos/gerar', pagamentoLimiter);
app.use('/api/empresa-config/alertas-dono/testar', alertasLimiter);
app.use('/api/portal-config', publicApiLimiter);
app.use('/api/hotspot-login', publicApiLimiter);


// Servir arquivos de campanhas (publicos, com cache de 1 dia)
app.use('/uploads/campanhas',
  express.static(path.join(__dirname, 'uploads', 'campanhas'), {
    maxAge: '1d',
    fallthrough: false,
  })
);

// Servir arquivos de branding (publicos, com cache de 7 dias)
app.use('/uploads/branding',
  express.static(path.join(__dirname, 'uploads', 'branding'), {
    maxAge: '7d',
    fallthrough: true,
  })
);

// --- Endpoint de Healthcheck Avançado ---
app.get(['/health', '/api/health'], async (req, res) => {
  const startTime = Date.now();
  const checks = {
    database: { status: 'unknown' },
    freeradius: { status: 'unknown' },
    memory: {},
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  };

  let isHealthy = true;

  // 1. Verificação do MySQL
  try {
    const dbStart = Date.now();
    await db.query('SELECT 1');
    checks.database = {
      status: 'healthy',
      latency_ms: Date.now() - dbStart
    };
  } catch (err) {
    isHealthy = false;
    checks.database = {
      status: 'unhealthy',
      error: err.message
    };
  }

  // 2. Verificação do FreeRADIUS (assíncrono e ultra-rápido)
  try {
    const { exec } = require('child_process');
    const radiusStatus = await new Promise((resolve) => {
      exec('systemctl is-active freeradius 2>/dev/null', { timeout: 800 }, (err, stdout) => {
        if (err) return resolve('inactive');
        resolve((stdout || '').trim() || 'inactive');
      });
    });
    checks.freeradius = {
      status: radiusStatus === 'active' ? 'active' : 'inactive'
    };
  } catch (e) {
    checks.freeradius = { status: 'unknown', error: e.message };
  }

  // 3. Métricas de Memória e Processo
  const mem = process.memoryUsage();
  checks.memory = {
    rss_mb: Math.round(mem.rss / 1024 / 1024),
    heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
    heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024)
  };

  checks.total_duration_ms = Date.now() - startTime;
  checks.status = isHealthy ? 'healthy' : 'unhealthy';

  return res.status(isHealthy ? 200 : 503).json(checks);
});

// --- Rotas públicas (sem auth) ---
const saasPlanoControllerAuthless = require("./src/controllers/saasPlanoController");
app.get("/api/public/saas-planos", saasPlanoControllerAuthless.getPlanosPublicos);
app.use('/api/admin', adminRoutes)          // Login
app.use('/api/auth', authRoutes)            // Auth
app.use('/api/auth', authTempRoutes)        // Acesso temporário
app.use("/api/planos-publicos", planPublicRoutes);
app.use("/api/pagamentos", pagamentoRoutes);  // Inclui webhook público
app.use("/api/lgpd", lgpdRoutes);             // LGPD login/cadastro são públicos
app.use("/api/registro", registroRoutes);       // Registro público de empresas

app.use("/api/public/campanha", campanhasPublicRoutes);

// Rota pública para login do portal Lead (sem auth)
const { leadLogin, capturaPassiva, cadastroCliente } = require("./src/controllers/leadController");
app.post("/api/lead-portal/login", leadLogin);
app.post("/api/lead-portal/passivo", capturaPassiva);
app.post("/api/clientes/cadastro", cadastroCliente);

// Rota pública para login do portal Wifi/Radius
app.use("/api/login-portal", loginPortalRoutes);
app.use("/api/auth/social", socialAuthRoutes);
app.use("/api/social-auth", socialAuthRoutes);

// Webhook público para receber mensagens do WhatsApp (Evolution API)
const crmCtrl = require("./src/controllers/crmController");
app.post("/api/crm/webhook", crmCtrl.receberWebhookWhatsapp);

// Rota pública para captura de leads da landing page (nuvycore.online)
app.post("/api/crm/lead-landing", crmCtrl.cadastrarLeadLanding);

// Endpoint público para o n8n buscar o contexto compilado da IA por empresa
const crmIaCtrl = require("./src/controllers/crmIaController");
app.get("/api/n8n/ia-contexto", crmIaCtrl.getN8nIaContexto);

// Webhook público para receber pagamentos PIX SaaS (Mercado Pago)
const saasFaturaCtrl = require("./src/controllers/saasFaturaController");
app.post("/api/webhooks/saas-pix", saasFaturaCtrl.processarWebhookPix);
app.get("/api/webhooks/saas-pix", saasFaturaCtrl.processarWebhookPix);


// --- Rotas protegidas (auth + tenant + permissão) ---
const checkPermissao = require('./src/middleware/checkPermissao');
app.use('/api/planos', auth, tenant, checkPermissao('planos'), planRoutes)
app.use("/api/mikrotiks", auth, tenant, checkPermissao('mikrotiks'), mikrotikRoutes);
app.use("/api/efi", auth, tenant, checkPermissao('configuracoes'), efiRoutes);
app.use("/api/config-mercadopago", auth, tenant, checkPermissao('configuracoes'), mercadoPagoRoutes);
app.use('/api/radius', auth, tenant, radiusRoutes);
app.use("/api/dashboard", auth, tenant, checkPermissao('dashboard'), dashboardRoutes);
app.use("/api/analytics", auth, tenant, checkPermissao("dashboard"), analyticsRoutes);
app.use("/api/nps", auth, tenant, checkPermissao("dashboard"), npsRoutes);
app.use("/api/whatsapp", auth, tenant, checkPermissao('configuracoes'), whatsappRoutes);
app.use("/api/limpeza", auth, tenant, checkPermissao('configuracoes'), limpezaRoutes);
app.use("/api/radius-logs", auth, tenant, checkPermissao('sessoeslog'), radiusLogsRoutes);
app.use("/api/admins", auth, tenant, checkPermissao('usuarios'), adminUserRoutes);
app.use("/api/wireguard", auth, tenant, checkPermissao('vpn'), wireguardRoutes);
app.use("/api/portais", auth, tenant, checkPermissao('portais'), portalRoutes);
app.use("/api/campanhas", auth, tenant, checkPermissao('portais'), campanhasRoutes);
app.use("/api/portal-templates", auth, tenant, checkPermissao('portais'), portalTemplateRoutes);
app.use("/api/leads", auth, tenant, checkPermissao('leads'), leadRoutes);
app.use("/api/crm", auth, tenant, checkPermissao('leads'), crmRoutes);
app.use("/api/compliance", auth, tenant, checkPermissao('compliance'), complianceRoutes);
app.use("/api/empresa-config", auth, tenant, checkPermissao('configuracoes'), empresaConfigRoutes);
app.use("/api/cupons", auth, tenant, cuponsRoutes);
app.use("/api/webhooks-outbound", webhookOutboundRoutes);
app.use("/api/filiais", filialRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/cardapio", cardapioRoutes);
app.use("/api/fidelidade", fidelidadeRoutes);
app.use("/api/lgpd-titular", lgpdTitularRoutes);
app.use("/api/financeiro", financeiroRoutes);

// Rota pública: config visual do portal (sem auth)
const portalCtrl = require("./src/controllers/portalController");
app.get("/api/portal-config/:tipo", portalCtrl.getPortalConfig);

const saasPlanoRoutes = require("./src/routes/saasPlanoRoutes");
const saasFaturaRoutes = require("./src/routes/saasFaturaRoutes");
const brandingRoutes = require("./src/routes/brandingRoutes");
app.use("/api/saas-planos", saasPlanoRoutes);
app.use("/api/saas-faturas", saasFaturaRoutes);
app.use("/api/saas-cartao", saasCartaoRoutes);
app.use("/api/branding", brandingRoutes);
app.use("/api/public/branding", require("./src/controllers/brandingController").obterBrandingPublico);
app.use("/api/empresas", empresaRoutes);  // Auth + authorize interno
app.use("/api/grupos-permissao", grupoPermissaoRoutes); // Auth + authorize interno
app.use("/api/system-backup", systemBackupRoutes);
app.use("/api/system-update", systemUpdateRoutes);
app.use("/api/logs", logsRoutes);
if (updatePublishRoutes) app.use("/api/update-publish", updatePublishRoutes);
if (updateCheckRoutes) app.use("/api/updates", updateCheckRoutes);

// Endpoint público: serve login.html para MikroTik baixar via /tool/fetch
// Este HTML é salvo como hotspot/login.html no MikroTik
// O RouterOS substitui $(mac), $(ip), $(username) etc antes de servir ao cliente
app.get("/api/hotspot-login/:mikrotikId", async (req, res) => {
  const { mikrotikId } = req.params;
  try {
    const [[mikrotik]] = await db.execute(
      `SELECT m.empresa_id, e.slug AS empresa_slug FROM mikrotiks m
       LEFT JOIN empresas e ON m.empresa_id = e.id WHERE m.id = ?`,
      [mikrotikId]
    );
    const empresaId = mikrotik?.empresa_id || '';
    const empresaSlug = mikrotik?.empresa_slug || 'default';
    const systemDomain = process.env.SYSTEM_DOMAIN || req.hostname;
    const portalUrl = `https://${systemDomain}/hotspot/redirect/${mikrotikId}`;
    const fullUrl = `${portalUrl}?mac=$(mac)&ip=$(ip)&mikrotik_id=${mikrotikId}&empresa_id=${empresaId}&empresa=${empresaSlug}`;

    // HTML no padrão MikroTik hotspot login.html
    // $(mac), $(ip), $(username), $(link-login), $(link-orig) são variáveis do RouterOS
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="pragma" content="no-cache">
  <meta http-equiv="expires" content="-1">
  <title>Hotspot Login</title>
  <style>
    body { background: #0f111a; color: #fff; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; padding: 40px; max-width: 400px; }
    .spinner { width: 40px; height: 40px; border: 4px solid #333; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    a { color: #3b82f6; }
    .info { font-size: 12px; color: #666; margin-top: 15px; }
  </style>
  <script>
    // Se ja tem username = usuario ja autenticou, ir para status
    var params = new URLSearchParams(window.location.search);
    if (params.has("username") && params.get("username") !== "") {
      window.location.href = "/status";
    } else {
      // Redirect para o portal da empresa
      setTimeout(function() {
        window.location.href = "${fullUrl}";
      }, 1500);
    }
  </script>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <h2>Conectando...</h2>
    <p>Redirecionando para o portal de acesso</p>
    <p class="info">MAC: $(mac) | IP: $(ip)</p>
    <p class="info">Se nao for redirecionado, <a href="${fullUrl}">clique aqui</a></p>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store");
    res.send(html);
  } catch (err) {
    res.status(500).send("<h1>Erro</h1>");
  }
});

// Endpoint público: serve status.html para MikroTik baixar via /tool/fetch
// O RouterOS substitui $(username), $(ip), $(uptime), $(bytes-in-nice), etc
app.get("/api/hotspot-status/:mikrotikId", async (req, res) => {
  try {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="pragma" content="no-cache">
  <meta http-equiv="expires" content="-1">
  $(if refresh-timeout)<meta http-equiv="refresh" content="$(refresh-timeout-secs)">$(endif)
  <title>Status - Hotspot</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f111a; color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .card {
      background: #1a1d27; border: 1px solid #2d3348; border-radius: 16px;
      padding: 32px; max-width: 420px; width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }
    .header { text-align: center; margin-bottom: 24px; }
    .avatar {
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; font-size: 24px; color: white; font-weight: bold;
    }
    .header h1 { font-size: 20px; font-weight: 700; color: #f1f5f9; }
    .header p { font-size: 13px; color: #64748b; margin-top: 4px; }
    .status-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: #065f46; color: #6ee7b7; padding: 4px 12px;
      border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px;
    }
    .status-dot { width: 8px; height: 8px; background: #34d399; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
    .stat {
      background: #0d1117; border: 1px solid #2d3348; border-radius: 12px; padding: 16px;
      text-align: center;
    }
    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .stat-value { font-size: 18px; font-weight: 700; color: #f1f5f9; }
    .stat-value.blue { color: #60a5fa; }
    .stat-value.green { color: #34d399; }
    .stat-value.orange { color: #fb923c; }
    .info-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid #1e2235;
      font-size: 13px;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; }
    .info-value { color: #e2e8f0; font-weight: 500; font-family: monospace; }
    .btn-logout {
      display: block; width: 100%; padding: 14px;
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: white; border: none; border-radius: 12px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      margin-top: 20px; transition: all 0.2s;
    }
    .btn-logout:hover { opacity: 0.9; transform: translateY(-1px); }
    .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #475569; }
    $(if refresh-timeout).refresh-bar {
      height: 3px; background: #1e293b; border-radius: 2px; margin-top: 16px; overflow: hidden;
    }
    .refresh-bar-fill {
      height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa);
      animation: refill $(refresh-timeout-secs)s linear infinite;
    }
    @keyframes refill { from { width: 0%; } to { width: 100%; } }
    $(endif)
  </style>
  <script>
    $(if advert-pending == 'yes')
    function openAdvert() {
      window.open('$(link-advert)', 'hotspot_advert', '');
    }
    $(endif)
    function doLogout() {
      if (window.name == 'hotspot_status') {
        window.open('$(link-logout)', 'hotspot_logout', 'toolbar=0,location=0,status=0,menubar=0,resizable=1,width=300,height=200');
        window.close();
        return false;
      }
      return true;
    }
  </script>
</head>
<body $(if advert-pending == 'yes')onload="openAdvert()"$(endif)>
  <div class="card">
    <div class="header">
      <div class="avatar">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
      </div>
      $(if login-by == 'trial')
        <h1>Acesso Trial</h1>
      $(elif login-by != 'mac')
        <h1>$(username)</h1>
      $(else)
        <h1>Conectado</h1>
      $(endif)
      <p>Sessao hotspot ativa</p>
      <div class="status-badge">
        <span class="status-dot"></span>
        Online
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-label">Tempo Online</div>
        <div class="stat-value green">$(uptime)</div>
      </div>
      $(if session-time-left)
      <div class="stat">
        <div class="stat-label">Tempo Restante</div>
        <div class="stat-value orange">$(session-time-left)</div>
      </div>
      $(else)
      <div class="stat">
        <div class="stat-label">IP</div>
        <div class="stat-value blue">$(ip)</div>
      </div>
      $(endif)
      <div class="stat">
        <div class="stat-label">Download</div>
        <div class="stat-value blue">$(bytes-out-nice)</div>
      </div>
      <div class="stat">
        <div class="stat-label">Upload</div>
        <div class="stat-value">$(bytes-in-nice)</div>
      </div>
    </div>

    <div style="background:#0d1117;border:1px solid #2d3348;border-radius:12px;padding:14px;margin-bottom:8px;">
      <div class="info-row">
        <span class="info-label">Endereco IP</span>
        <span class="info-value">$(ip)</span>
      </div>
      <div class="info-row">
        <span class="info-label">MAC Address</span>
        <span class="info-value">$(mac)</span>
      </div>
      $(if session-time-left)
      <div class="info-row">
        <span class="info-label">Conectado / Restante</span>
        <span class="info-value">$(uptime) / $(session-time-left)</span>
      </div>
      $(endif)
      $(if blocked == 'yes')
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value" style="color:#fb923c;">
          <a href="$(link-advert)" target="hotspot_advert" style="color:#fb923c;text-decoration:none;">Publicidade pendente</a>
        </span>
      </div>
      $(elif refresh-timeout)
      <div class="info-row">
        <span class="info-label">Atualiza em</span>
        <span class="info-value">$(refresh-timeout)</span>
      </div>
      $(endif)
    </div>

    $(if login-by-mac != 'yes')
    <form action="$(link-logout)" name="logout" onsubmit="return doLogout()">
      <button type="submit" class="btn-logout">Desconectar</button>
    </form>
    $(endif)

    $(if refresh-timeout)
    <div class="refresh-bar"><div class="refresh-bar-fill"></div></div>
    $(endif)

    <div class="footer">Hotspot WiFi &bull; Protegido por LGPD</div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store");
    res.send(html);
  } catch (err) {
    res.status(500).send("<h1>Erro</h1>");
  }
});

// Endpoint público: Conexão 1-Clique Básico do Wi-Fi
app.get("/hotspot/auth", async (req, res) => {
  const { mac, ip, mikrotik_id, empresa_id, free } = req.query;

  if (!mikrotik_id) {
    return res.status(400).send("<h1>Parâmetro mikrotik_id é obrigatório para conectar</h1>");
  }

  try {
    const { gerarAcessoTemporario } = require("./src/controllers/authTempController");

    // Busca plano basico default ou usa o primeiro q achar se n der, ou usa null para pegar mk default limits
    const [[plano]] = await db.query(
      "SELECT id FROM planos WHERE empresa_id = ? ORDER BY id ASC LIMIT 1",
      [empresa_id]
    );

    const resultado = await gerarAcessoTemporario(mac, ip, plano ? plano.id : null, empresa_id, {
      usernamePrefix: "free1click",
      rateLimit: free ? "1M/1M" : "5M/5M", // velocidade do 1-clique basic
      duracaoSegundos: 3600 // 1 hora de cortesia no 1-clique puro
    });

    // Redirecionar para o mikrotik usando credentials geradas pelo RADIUS localmente
    const redirectUrl = `http://${resultado.gateway}/login?username=${encodeURIComponent(resultado.username)}&password=${encodeURIComponent(resultado.password)}`;
    return res.redirect(redirectUrl);

  } catch (err) {
    console.error("Erro no 1-Clique Login (/hotspot/auth):", err);
    res.status(500).send("<h1>Serviço temporariamente indisponível. Tente novamente.</h1>");
  }
});

// Endpoint público: redirect dinâmico do captive portal
app.get("/hotspot/redirect/:mikrotikId", async (req, res) => {
  const { mikrotikId } = req.params;
  const { mac, ip } = req.query;

  try {
    // Busca MikroTik com dados da empresa
    const [[mikrotik]] = await db.execute(
      `SELECT m.*, e.slug AS empresa_slug, e.id AS eid
       FROM mikrotiks m
       LEFT JOIN empresas e ON m.empresa_id = e.id
       WHERE m.id = ?`,
      [mikrotikId]
    );
    if (!mikrotik || !mikrotik.portal_id) {
      return res.status(404).send("<h1>Portal não configurado para este hotspot</h1>");
    }

    const [[portal]] = await db.execute("SELECT * FROM portais WHERE id = ?", [mikrotik.portal_id]);
    if (!portal) {
      return res.status(404).send("<h1>Portal não encontrado</h1>");
    }

    const empresaId = mikrotik.empresa_id;
    const empresaSlug = mikrotik.empresa_slug || 'default';

    // Pré-portal: se o portal tem campanha ativa e usuario ainda nao viu, redireciona
    if (portal.campanha_ativa_id && req.query.campanha_vista !== '1') {
      const qs = new URLSearchParams({
        mac: mac || '',
        ip: ip || '',
        mikrotik_id: mikrotikId,
        empresa_id: empresaId,
        empresa: empresaSlug,
      }).toString();
      return res.redirect(302, `/campanha/${portal.id}?${qs}`);
    }

    const params = `mac=${encodeURIComponent(mac || "")}&ip=${encodeURIComponent(ip || "")}&mikrotik_id=${mikrotikId}&empresa_id=${empresaId}&empresa=${empresaSlug}`;

    if (portal.tipo === "custom" && portal.html_content) {
      let html = portal.html_content
        .replace(/\$\(mac\)/g, mac || "")
        .replace(/\$\(ip\)/g, ip || "")
        .replace(/\$\(mikrotik_id\)/g, mikrotikId)
        .replace(/\$\(empresa_id\)/g, empresaId)
        .replace(/\$\(empresa\)/g, empresaSlug);

      // Parse das configurações para injetar no visual
      let cfg = {};
      try { if (portal.configuracoes) cfg = JSON.parse(portal.configuracoes); } catch (e) { }

      let injector = `<style>
        body { background: linear-gradient(135deg, ${cfg.cor_fundo_1 || '#0f111a'} 0%, ${cfg.cor_fundo_2 || cfg.cor_fundo_1 || '#1a1d2e'} 100%) !important; }
        .btn-connect, .btn-plan, .btn { background: ${cfg.cor_botao || '#3B82F6'} !important; border:none!important; color:#fff!important; box-shadow:none!important; }
        .btn-connect:hover, .btn-plan:hover, .btn:hover { filter: brightness(1.1); transform: translateY(-2px); }
      </style>
      <script>
      document.addEventListener("DOMContentLoaded", function() {
        const titulo = ${JSON.stringify(cfg.titulo || '')};
        const subtitulo = ${JSON.stringify(cfg.subtitulo || '')};
        const textoBotao = ${JSON.stringify(cfg.texto_botao || '')};
        const logoUrl = ${JSON.stringify(cfg.logo_url || '')};
        
        const h1 = document.querySelector("h1");
        if (h1 && titulo) h1.textContent = titulo;
        
        const sub = document.querySelector(".subtitle");
        if (sub && subtitulo) sub.textContent = subtitulo;
        
        const btn = document.querySelector(".btn-connect, .btn-plan, .btn");
        if (btn && textoBotao) {
          const span = btn.querySelector("span");
          if (span) span.textContent = textoBotao;
          else btn.textContent = textoBotao;
        }
        
        if (logoUrl) {
          const iconDiv = document.querySelector(".icon");
          if (iconDiv) {
            iconDiv.style.background = "none";
            iconDiv.innerHTML = '<img src="' + logoUrl + '" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:16px;">';
          }
        }
      });
      </script>`;

      // Injetar CSS customizado se existir
      if (portal.custom_css) {
        html = html.replace('</head>', `<style>${portal.custom_css}</style></head>`);
      }

      html = html.replace('</body>', `${injector}</body>`);

      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    }

    if (portal.url_redirect) {
      const separator = portal.url_redirect.includes("?") ? "&" : "?";
      return res.redirect(`${portal.url_redirect}${separator}${params}`);
    }

    res.status(400).send("<h1>Portal sem configuração de redirect</h1>");
  } catch (err) {
    console.error("Erro no redirect do captive portal:", err);
    res.status(500).send("<h1>Erro interno</h1>");
  }
});


const cron = require('node-cron');
const syncConnectionLogs = require('./src/jobs/syncConnectionLogs');
const runCrmAutomationsJob = require('./src/jobs/crmAutomationsJob');

// Sincronizar logs de conexão do RADIUS (Marco Civil) a cada 5 minutos
cron.schedule('*/5 * * * *', () => {
  console.log('[CRON] Iniciando syncConnectionLogs...');
  syncConnectionLogs().catch(err => console.error('[CRON] Erro:', err));
});

// Automações de Marketing WhatsApp CRM a cada 2 minutos
cron.schedule('*/2 * * * *', () => {
  runCrmAutomationsJob().catch(err => console.error('[CRON] crmAutomationsJob erro:', err.message));
});

// Processamento de Faturamento SaaS a cada 1 hora
const { processarFaturamentoSaas } = require('./src/jobs/saasBillingJob');
cron.schedule('0 * * * *', () => {
  processarFaturamentoSaas().catch(err => console.error('[CRON] saasBillingJob erro:', err.message));
});

// Backup Geral Completo do Sistema (MySQL + Código + n8n + Uploads) todas as madrugadas às 03:00 AM
const backupService = require('./src/services/backupService');
cron.schedule('0 3 * * *', () => {
  console.log('[CRON 💾] Executando Backup Geral Diário (03:00 AM)...');
  backupService.executarBackupGeral({ disparadoPor: 'Agendamento Diário (03:00 AM)' })
    .catch(err => console.error('[CRON Backup Error]:', err.message));
});

// --- Tela de emergencia (Secure) ---
const crypto = require("crypto");
const authorizeEmergency = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas super admin.' });
  }
  const token = req.headers['x-emergency-token'];
  const envToken = process.env.EMERGENCY_ACCESS_TOKEN;
  if (!envToken) return res.status(500).json({ error: 'Token não configurado no servidor.' });
  if (!token || token.length !== envToken.length) return res.status(401).json({ error: 'Token inválido.' });
  if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(envToken))) {
    return res.status(401).json({ error: 'Token inválido.' });
  }
  next();
};

app.get('/emergency', (req, res) => {
  res.status(403).send('<h1>Acesso Negado</h1><p>A tela de emergência web foi desativada por motivos de segurança.</p>');
});
const systemBackupCtrl = require('./src/controllers/systemBackupController');
app.get('/api/emergency/backups', auth, authorizeEmergency, systemBackupCtrl.listarBackups);
app.post('/api/emergency/backup', auth, authorizeEmergency, systemBackupCtrl.criarBackup);
app.post('/api/emergency/restore/:id', auth, authorizeEmergency, systemBackupCtrl.restaurarBackup);

try {
  const { ensureFreeradiusDict } = require('./src/utils/ensureFreeradiusDict');
  ensureFreeradiusDict();
} catch (err) {
  console.warn('[freeradius-dict] erro inesperado:', err.message);
}

// Iniciar WebFig Reverse Proxy (porta 3002 interna)
try {
  const { startWebfigProxy } = require('./src/services/webfigProxy');
  startWebfigProxy();
} catch (err) {
  console.error('[webfig-proxy] erro ao iniciar proxy:', err.message);
}

// Túneis TCP Winbox Remoto são gerenciados sob demanda (On-Demand) pelo wireguardController/winboxProxy

app.listen(process.env.PORT || 3001, () => {
  console.log(`API rodando na porta ${process.env.PORT || 3001}`)
})
