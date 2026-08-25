export function limparCpf(cpf) {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '');
}

export function formatarGatewayUrl(gatewayUrl) {
  if (!gatewayUrl) return '';
  let url = String(gatewayUrl).trim();
  if (!url) return '';

  // Se não começa com http:// ou https://, força http://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }

  // Se não possui caminho /login ou /login.html, adiciona /login
  try {
    const parsed = new URL(url);
    if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '') {
      parsed.pathname = '/login';
      url = parsed.toString();
    }
  } catch (e) {
    if (!url.endsWith('/login') && !url.endsWith('/login.html')) {
      url = url.replace(/\/+$/, '') + '/login';
    }
  }

  return url;
}

export function redirecionarHotspot(gatewayUrl, username, password, dstUrl) {
  if (!gatewayUrl) {
    if (dstUrl) window.location.href = dstUrl;
    return;
  }

  const actionUrl = formatarGatewayUrl(gatewayUrl);

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;

  const inputUser = document.createElement('input');
  inputUser.type = 'hidden';
  inputUser.name = 'username';
  inputUser.value = username || '';
  form.appendChild(inputUser);

  const inputPass = document.createElement('input');
  inputPass.type = 'hidden';
  inputPass.name = 'password';
  inputPass.value = password || '';
  form.appendChild(inputPass);

  if (dstUrl) {
    const inputDst = document.createElement('input');
    inputDst.type = 'hidden';
    inputDst.name = 'dst';
    inputDst.value = dstUrl;
    form.appendChild(inputDst);
  }

  document.body.appendChild(form);
  form.submit();
}

export function efetuarRedirectHotspot({ gatewayUrl, username, password, redirectUrl, gatewayType }) {
  const tipo = (gatewayType || 'mikrotik').toLowerCase();

  if (tipo === 'omada' || tipo === 'unifi') {
    const dest = redirectUrl || 'https://www.google.com';
    window.location.href = dest;
    return;
  }

  redirecionarHotspot(gatewayUrl, username, password, redirectUrl);
}

export default {
  limparCpf,
  formatarGatewayUrl,
  redirecionarHotspot,
  efetuarRedirectHotspot
};
