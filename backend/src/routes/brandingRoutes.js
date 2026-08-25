const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/brandingController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Diretórios para upload de branding
const distUploadsDir = path.join(__dirname, '../../../frontend/dist/uploads/branding');
const publicUploadsDir = path.join(__dirname, '../../../frontend/public/uploads/branding');
const backendUploadsDir = path.join(__dirname, '../../uploads/branding');

[distUploadsDir, publicUploadsDir, backendUploadsDir].forEach(d => {
  if (!fs.existsSync(d)) {
    try {
      fs.mkdirSync(d, { recursive: true });
    } catch (e) {
      console.error('Erro ao criar diretório de upload:', d, e.message);
    }
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, backendUploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = req.path.includes('favicon') ? 'favicon' : 'logo';
    cb(null, `${prefix}-master-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp|svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(file.mimetype) ||
        /\.(png|jpg|jpeg|svg|webp|ico)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens válidas (PNG, SVG, JPG, WEBP, ICO) são permitidas'));
    }
  }
});

// Middleware para sincronizar os arquivos para as pastas do frontend (dist e public)
const copyToFrontend = (req, res, next) => {
  if (req.file) {
    try {
      const filename = req.file.filename;
      const srcPath = req.file.path;

      [distUploadsDir, publicUploadsDir].forEach(targetDir => {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.copyFileSync(srcPath, path.join(targetDir, filename));
      });
    } catch (err) {
      console.warn('Aviso: Não foi possível sincronizar arquivo de branding com frontend public/dist:', err.message);
    }
  }
  next();
};

// 1. Rota Pública para consulta rápida
router.get('/public', ctrl.obterBrandingPublico);

// 2. Rotas Protegidas (Super Admin)
router.use(auth, authorize('super_admin'));

router.get('/', ctrl.obterBrandingSuper);
router.put('/', ctrl.atualizarBranding);
router.post('/upload-logo', upload.single('logo'), copyToFrontend, ctrl.uploadLogo);
router.post('/upload-favicon', upload.single('favicon'), copyToFrontend, ctrl.uploadFavicon);
router.post('/restaurar-padrao', ctrl.restaurarPadrao);

module.exports = router;
