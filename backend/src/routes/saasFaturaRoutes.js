const express = require("express");
const router = express.Router();
const saasFaturaController = require("../controllers/saasFaturaController");
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");

router.all("/bot/consulta-pix", saasFaturaController.consultaPixBot);
router.get("/stats", saasFaturaController.getDashboardStats);
router.get("/relatorio-avancado", saasFaturaController.getRelatorioAvancado);
router.get("/exportar-csv", saasFaturaController.exportarCSV);
router.get("/preview-comissao", saasFaturaController.calcularPreviewFatura);
router.post("/gerar-mensalidade", saasFaturaController.gerarMensalidadeManual);
router.post("/disparos-whatsapp", saasFaturaController.executarDisparosManuaisWhatsapp);
router.get("/minhas-faturas", auth, tenant, saasFaturaController.getMinhasFaturas);
router.post("/assinar-plano", auth, tenant, saasFaturaController.assinarPlano);
router.get("/", saasFaturaController.getFaturas);
router.post("/", saasFaturaController.criarFatura);
router.post("/:id/gerar-pix", auth, saasFaturaController.gerarPixFatura);
router.put("/:id/baixa", saasFaturaController.darBaixaFatura);
router.post("/:id/notificar", saasFaturaController.notificarWhatsApp);
router.delete("/:id", saasFaturaController.cancelarFatura);

module.exports = router;

