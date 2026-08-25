const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const checkPermissao = require("../middleware/checkPermissao");
const {
  gerarLote,
  listarLotes,
  obterLoteDetalhado,
  deletarLote
} = require("../controllers/voucherController");

// Rotas autenticadas do painel admin
router.use(auth, tenant, checkPermissao("planos"));

router.get("/lotes", listarLotes);
router.get("/lotes/:id", obterLoteDetalhado);
router.post("/gerar-lote", gerarLote);
router.delete("/lotes/:id", deletarLote);

module.exports = router;
