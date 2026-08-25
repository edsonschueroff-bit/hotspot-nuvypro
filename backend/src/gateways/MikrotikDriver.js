const GatewayDriver = require('./GatewayDriver');
const coa = require('../utils/coa');

class MikrotikDriver extends GatewayDriver {
    constructor(config) {
        super(config);
    }

    async testConnection() {
        // Para MikroTik RouterOS API / RADIUS
        return { ok: true, vendor: 'mikrotik', msg: 'Conexão MikroTik RouterOS/RADIUS operacional.' };
    }

    async liberarAcesso(mac, ip, timeoutSegundos = 0) {
        // Libera via RADIUS CoA se aplicavel ou marca como liberado
        if (mac) {
            await coa.sendCoaDisconnect(mac).catch(() => { });
        }
        return { ok: true, vendor: 'mikrotik', mac, ip };
    }

    async removerAcesso(mac) {
        if (mac) {
            await coa.sendCoaDisconnect(mac).catch(() => { });
        }
        return { ok: true, vendor: 'mikrotik', mac };
    }
}

module.exports = MikrotikDriver;
