const http = require('http');
const httpProxy = require('http-proxy');
const jwt = require('jsonwebtoken');

const PROXY_PORT = process.env.WEBFIG_PROXY_PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET;

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true,
  autoRewrite: true,
  timeout: 30000,
  proxyTimeout: 30000,
});

proxy.on('error', (err, req, res) => {
  console.error('[WebFig Proxy Error]', err.message);
  if (res.writeHead && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erro de Conexão - WebFig MikroTik</title>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; border: 1px solid #334155; padding: 32px; border-radius: 16px; max-width: 480px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          h1 { color: #ef4444; font-size: 20px; margin-bottom: 12px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
          .btn { background: #2563eb; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; cursor: pointer; border: none; }
          .btn:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>⚠️ MikroTik Inacessível</h1>
          <p>Não foi possível estabelecer conexão com o WebFig (porta 80) no IP VPN deste equipamento. Verifique se o roteador está online na VPN e se o serviço <code>/ip service www</code> está ativo no MikroTik.</p>
          <button class="btn" onclick="window.location.reload()">Tentar Novamente</button>
        </div>
      </body>
      </html>
    `);
  }
});

const parseCookies = (req) => {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let token = url.searchParams.get('token');
  const cookies = parseCookies(req);

  if (!token && cookies.mk_proxy_token) {
    token = cookies.mk_proxy_token;
  }

  if (!token) {
    res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sessão Expirada - WebFig Proxy</title>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; border: 1px solid #334155; padding: 32px; border-radius: 16px; max-width: 440px; text-align: center; }
          h1 { color: #f59e0b; font-size: 18px; margin-bottom: 12px; }
          p { color: #94a3b8; font-size: 13px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🔒 Acesso Não Autorizado</h1>
          <p>O token de acesso ao WebFig deste MikroTik não foi fornecido ou expirou. Feche esta aba e clique novamente em <strong>Acessar WebFig</strong> no painel de administração.</p>
        </div>
      </body>
      </html>
    `);
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<h1>Token de acesso inválido ou expirado. Por favor gere um novo acesso no painel.</h1>');
  }

  const targetIp = payload.vpn_ip;
  if (!targetIp) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('IP VPN não encontrado no token');
  }

  // Se veio token na URL, grava cookie para requests de assets / jsproxy subsequentes
  if (url.searchParams.has('token')) {
    res.setHeader('Set-Cookie', `mk_proxy_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7200`);
    
    // Limpa a query da URL para não poluir
    url.searchParams.delete('token');
    req.url = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '');
  }

  // Target MikroTik HTTP WebFig
  const target = `http://${targetIp}:80`;
  proxy.web(req, res, { target });
});

// Suporte a WebSockets caso RouterOS use
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let token = url.searchParams.get('token');
  const cookies = parseCookies(req);

  if (!token && cookies.mk_proxy_token) {
    token = cookies.mk_proxy_token;
  }

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.vpn_ip) {
        proxy.ws(req, socket, head, { target: `http://${payload.vpn_ip}:80` });
        return;
      }
    } catch (e) {}
  }
  socket.destroy();
});

const startWebfigProxy = () => {
  server.listen(PROXY_PORT, '127.0.0.1', () => {
    console.log(`[WebFig Proxy] Servidor proxy ativo em 127.0.0.1:${PROXY_PORT}`);
  });
};

module.exports = { startWebfigProxy };
