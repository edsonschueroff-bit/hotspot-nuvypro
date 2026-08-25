class GatewayDriver {
    constructor(mikrotikConfig) {
        this.config = mikrotikConfig;
        this.tipo = mikrotikConfig?.tipo || 'mikrotik';
    }

    async testConnection() {
        throw new Error('testConnection() deve ser implementado no driver filho');
    }

    async liberarAcesso(mac, ip, timeoutSegundos = 0) {
        throw new Error('liberarAcesso() deve ser implementado no driver filho');
    }

    async removerAcesso(mac) {
        throw new Error('removerAcesso() deve ser implementado no driver filho');
    }
}

module.exports = GatewayDriver;
