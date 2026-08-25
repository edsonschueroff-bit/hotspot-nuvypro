const express = require("express");
const router = express.Router();
const cuponsCtrl = require("../controllers/cuponsController");

// Rota pública para geração do voucher pós-conexão
router.post("/gerar-publico", cuponsCtrl.gerarCupomConexao);

// Rotas protegidas (chamadas via /api/cupons com auth + tenant)
router.get("/", cuponsCtrl.listCupons);
router.post("/", cuponsCtrl.createCupom);
router.put("/:id", cuponsCtrl.updateCupom);
router.delete("/:id", cuponsCtrl.deleteCupom);

router.post("/validar", cuponsCtrl.validarCupom);
router.get("/resgates", cuponsCtrl.listResgates);
router.get("/metricas", cuponsCtrl.getMetricas);

module.exports = router;
