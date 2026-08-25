const express = require('express');
const router = express.Router();
const controller = require('../controllers/wireguardController');

router.get('/status', controller.getVpnStatus);
router.get('/settings', controller.getServerSettings);
router.put('/settings', controller.updateServerSettings);
router.post('/clients', controller.createClient);
router.delete('/clients/:id', controller.deleteClient);
router.get('/clients/:id/config', controller.getClientConfig);
router.get('/peer-diagnostics/:id', controller.getPeerDiagnostics);
router.post('/webfig-token', controller.generateWebfigToken);

// Túneis Winbox Sob Demanda
router.post('/winbox-tunnel/enable', controller.enableWinboxTunnel);
router.post('/winbox-tunnel/heartbeat', controller.heartbeatWinboxTunnel);
router.post('/winbox-tunnel/disable', controller.disableWinboxTunnel);
router.get('/winbox-tunnel/status/:vpnIp', controller.getWinboxTunnelStatus);

module.exports = router;
