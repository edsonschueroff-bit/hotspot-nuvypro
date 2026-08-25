const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const {
  listarBackups,
  criarBackup,
  restaurarBackup,
  deletarBackup,
} = require('../controllers/systemBackupController');

const adminBackupCtrl = require('../controllers/adminBackupController');

router.use(auth, authorize('super_admin'));

router.get('/', adminBackupCtrl.listarBackups);
router.post('/', adminBackupCtrl.gerarBackup);
router.get('/email-config', adminBackupCtrl.getEmailConfig);
router.post('/email-config', adminBackupCtrl.saveEmailConfig);
router.post('/test-email', adminBackupCtrl.testEmail);
router.post('/upload', adminBackupCtrl.uploadMiddleware, adminBackupCtrl.uploadBackup);
router.get('/download/:filename', adminBackupCtrl.downloadBackup);
router.post('/restore/:filename', adminBackupCtrl.restaurarBackup);
router.delete('/:filename', adminBackupCtrl.excluirBackup);

module.exports = router;
