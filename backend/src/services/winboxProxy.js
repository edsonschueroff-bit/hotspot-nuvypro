const net = require('net');

/**
 * Mapa em memória dos túneis Winbox ativos sob demanda:
 * key: publicPort (ex: 20002)
 * value: {
 *   server,
 *   targetIp,
 *   lastOctet,
 *   activeSockets: Set<net.Socket>,
 *   lastHeartbeat: number,
 *   checkInterval: NodeJS.Timeout
 * }
 */
const activeTunnels = new Map();

/**
 * Habilita ou renova o túnel Winbox sob demanda para um IP VPN (10.8.0.X).
 * Mapeamento: 10.8.0.X -> porta pública 20000 + X (ex: 10.8.0.2 -> 20002)
 */
function enableWinboxTunnel(lastOctet) {
  const octet = parseInt(lastOctet);
  if (isNaN(octet) || octet < 2 || octet > 254) {
    return { success: false, message: 'Octeto IP inválido' };
  }

  const publicPort = 20000 + octet;
  const targetIp = `10.8.0.${octet}`;

  // Se o túnel já estiver aberto, apenas renova o heartbeat
  if (activeTunnels.has(publicPort)) {
    const tunnel = activeTunnels.get(publicPort);
    tunnel.lastHeartbeat = Date.now();
    return {
      success: true,
      port: publicPort,
      targetIp,
      activeConnections: tunnel.activeSockets.size,
      message: 'Túnel já ativo, heartbeat renovado'
    };
  }

  const activeSockets = new Set();

  const server = net.createServer((clientSocket) => {
    activeSockets.add(clientSocket);
    console.log(`[Winbox Proxy] Nova conexão Winbox recebida na porta ${publicPort} (Total ativas: ${activeSockets.size})`);

    const targetSocket = net.createConnection({ port: 8291, host: targetIp }, () => {
      // Conectado ao MikroTik via VPN
    });

    clientSocket.pipe(targetSocket);
    targetSocket.pipe(clientSocket);

    const cleanup = () => {
      activeSockets.delete(clientSocket);
      targetSocket.destroy();
      console.log(`[Winbox Proxy] Conexão Winbox fechada na porta ${publicPort} (Restantes: ${activeSockets.size})`);
    };

    clientSocket.on('error', cleanup);
    targetSocket.on('error', cleanup);
    clientSocket.on('close', cleanup);
    targetSocket.on('close', cleanup);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Winbox Proxy] Porta ${publicPort} já em uso.`);
    } else {
      console.error(`[Winbox Proxy] Erro na porta ${publicPort}:`, err.message);
    }
  });

  server.listen(publicPort, '0.0.0.0', () => {
    console.log(`[Winbox Proxy] Túnel Winbox ON-DEMAND aberto na porta ${publicPort} -> ${targetIp}:8291`);
  });

  // Monitor de inatividade inteligente (Opção 3 - Híbrida)
  // Checa a cada 10 segundos
  const checkInterval = setInterval(() => {
    const tunnel = activeTunnels.get(publicPort);
    if (!tunnel) {
      clearInterval(checkInterval);
      return;
    }

    const now = Date.now();
    const timeSinceHeartbeat = now - tunnel.lastHeartbeat;

    // Se o modal do navegador foi fechado (sem heartbeat há mais de 30s)
    // E não há conexões ativas do Winbox (ou se todas já foram encerradas)
    if (timeSinceHeartbeat > 30000 && tunnel.activeSockets.size === 0) {
      console.log(`[Winbox Proxy] Encerrando túnel da porta ${publicPort} por inatividade (Sem heartbeat e 0 conexões ativas).`);
      disableWinboxTunnel(octet);
    }
  }, 10000);

  const tunnelData = {
    server,
    targetIp,
    lastOctet: octet,
    activeSockets,
    lastHeartbeat: Date.now(),
    checkInterval
  };

  activeTunnels.set(publicPort, tunnelData);

  return {
    success: true,
    port: publicPort,
    targetIp,
    activeConnections: 0,
    message: 'Túnel Winbox aberto com sucesso'
  };
}

/**
 * Atualiza o pulso de presença (heartbeat) do modal web
 */
function heartbeatWinboxTunnel(lastOctet) {
  const octet = parseInt(lastOctet);
  const publicPort = 20000 + octet;
  const tunnel = activeTunnels.get(publicPort);

  if (tunnel) {
    tunnel.lastHeartbeat = Date.now();
    return {
      success: true,
      active: true,
      port: publicPort,
      activeConnections: tunnel.activeSockets.size
    };
  }

  // Se não estava ativo, reativa
  return enableWinboxTunnel(lastOctet);
}

/**
 * Encerra o túnel e desconecta sockets
 */
function disableWinboxTunnel(lastOctet, force = false) {
  const octet = parseInt(lastOctet);
  const publicPort = 20000 + octet;
  const tunnel = activeTunnels.get(publicPort);

  if (!tunnel) {
    return { success: true, message: 'Túnel já estava fechado' };
  }

  clearInterval(tunnel.checkInterval);

  // Destrói conexões ativas se for forçado
  if (force) {
    for (const socket of tunnel.activeSockets) {
      try {
        socket.destroy();
      } catch (e) {}
    }
  }

  tunnel.server.close(() => {
    console.log(`[Winbox Proxy] Porta pública ${publicPort} fechada com sucesso.`);
  });

  activeTunnels.delete(publicPort);

  return {
    success: true,
    port: publicPort,
    message: 'Túnel Winbox encerrado com sucesso'
  };
}

/**
 * Consulta o status do túnel para um IP/octeto
 */
function getWinboxTunnelStatus(lastOctet) {
  const octet = parseInt(lastOctet);
  const publicPort = 20000 + octet;
  const tunnel = activeTunnels.get(publicPort);

  if (tunnel) {
    return {
      active: true,
      port: publicPort,
      activeConnections: tunnel.activeSockets.size,
      lastHeartbeat: tunnel.lastHeartbeat
    };
  }

  return {
    active: false,
    port: publicPort,
    activeConnections: 0,
    lastHeartbeat: null
  };
}

module.exports = {
  enableWinboxTunnel,
  heartbeatWinboxTunnel,
  disableWinboxTunnel,
  getWinboxTunnelStatus
};
