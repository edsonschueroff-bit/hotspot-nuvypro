export function limparCpf(cpf) {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '');
}

export function formatarGatewayUrl(gatewayUrl) {
  if (!gatewayUrl) return 'http://10.5.50.1/login';
  let url = String(gatewayUrl).trim();
  if (!url) return 'http://10.5.50.1/login';

  // Se não começa com http:// ou https://, força http://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }

  // Se o IP informado for de cliente (ex: 10.5.50.253), converte para o gateway do roteador 10.5.50.1
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (host && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      const parts = host.split('.');
      const lastOctet = parseInt(parts[3], 10);
      if (lastOctet > 10) {
        parsed.hostname = `${parts[0]}.${parts[1]}.${parts[2]}.1`;
        url = parsed.toString();
      }
    }
    
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
    if (dstUrl && typeof dstUrl === 'string' && (dstUrl.startsWith('http://') || dstUrl.startsWith('https://'))) {
      window.location.href = dstUrl;
    }
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

  // Apenas inclui dst se for uma URL válida (não um timeout em milissegundos)
  if (dstUrl && typeof dstUrl === 'string' && (dstUrl.startsWith('http://') || dstUrl.startsWith('https://') || dstUrl.startsWith('/'))) {
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
