const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const controller = require("../controllers/webhookOutboundController");

// Todas as rotas de gerenciamento de webhooks são protegidas por autenticação de admin e contexto do tenant
router.use(auth);
router.use(tenant);

router.get("/", controller.listarWebhooks);
router.post("/", controller.criarWebhook);
router.put("/:id", controller.atualizarWebhook);
router.delete("/:id", controller.deletarWebhook);
router.post("/:id/testar", controller.testarEnvio);
router.get("/:id/logs", controller.obterLogs);

module.exports = router;
