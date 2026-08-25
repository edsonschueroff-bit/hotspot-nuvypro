const db = require('../db');
const { getGatewayDriver } = require('../gateways');

async function resolverContextoGateway(req) {
    const { mac, ip, mikrotik_id, gateway_type } = req.query || req.body || {};

    let mikrotik = null;
    if (mikrotik_id) {
        const [[row]] = await db.query("SELECT * FROM mikrotiks WHERE id = ?", [mikrotik_id]);
        mikrotik = row || null;
    }

    const driver = getGatewayDriver(mikrotik || { tipo: gateway_type || 'mikrotik' });

    return {
        mikrotik,
        driver,
        tipo: mikrotik?.tipo || gateway_type || 'mikrotik'
    };
}

async function registrarContextoPortal(data) {
    try {
        const { empresa_id, mikrotik_id, portal_id, client_mac, client_ip, gateway_type, redirect_url, vendor_extra } = data;
        await db.query(
            `INSERT INTO portal_contexts (empresa_id, mikrotik_id, portal_id, client_mac, client_ip, gateway_type, redirect_url, vendor_extra, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                empresa_id,
                mikrotik_id || null,
                portal_id || null,
                client_mac || '',
                client_ip || '',
                gateway_type || 'mikrotik',
                redirect_url || null,
                vendor_extra ? JSON.stringify(vendor_extra) : null
            ]
        );
    } catch (err) {
        console.warn('[portalVendor] Aviso ao registrar portal_contexts:', err.message);
    }
}

module.exports = {
    resolverContextoGateway,
    registrarContextoPortal
};
