const MikrotikDriver = require('./MikrotikDriver');
const OmadaDriver = require('./OmadaDriver');
const UnifiDriver = require('./UnifiDriver');

function getGatewayDriver(mikrotikConfig) {
    const tipo = (mikrotikConfig?.tipo || 'mikrotik').toLowerCase();

    switch (tipo) {
        case 'omada':
            return new OmadaDriver(mikrotikConfig);
        case 'unifi':
            return new UnifiDriver(mikrotikConfig);
        case 'mikrotik':
        default:
            return new MikrotikDriver(mikrotikConfig);
    }
}

module.exports = {
    getGatewayDriver,
    MikrotikDriver,
    OmadaDriver,
    UnifiDriver
};
