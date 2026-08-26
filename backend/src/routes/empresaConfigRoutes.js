const express = require("express");
const router = express.Router();
const controller = require("../controllers/empresaConfigController");
const { publicApiLimiter } = require("../middleware/rateLimiters");

// Testar conexão MP, Alertas Dono e SMTP (deve vir antes de /:tipo para não conflitar)
router.post("/mercadopago/testar", publicApiLimiter, controller.testarConexaoMercadoPago);
router.post("/alertas-dono/testar", publicApiLimiter, controller.testarAlertasDono);
router.post("/smtp/testar", publicApiLimiter, controller.testarConexaoSmtp);

// CRUD genérico por tipo
router.get("/:tipo", controller.obterConfig);
router.post("/:tipo", controller.salvarConfig);

module.exports = router;
