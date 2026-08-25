const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const controller = require("../controllers/filialController");

// Rotas de gestão de filiais e rede protegidas por autenticação e contexto do tenant
router.use(auth);
router.use(tenant);

router.get("/", controller.listarFiliais);
router.get("/metricas-consolidadas", controller.obterMetricasConsolidadas);
router.post("/", controller.criarFilial);
router.put("/:id", controller.atualizarFilial);
router.delete("/:id", controller.desativarFilial);

module.exports = router;
