const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const checkPermissao = require("../middleware/checkPermissao");
const {
  listarRegras,
  criarRegra,
  atualizarRegra,
  deletarRegra,
  obterRankingEHistorico
} = require("../controllers/fidelidadeController");

// Rotas protegidas admin
router.use(auth, tenant, checkPermissao("leads"));

router.get("/regras", listarRegras);
router.post("/regras", criarRegra);
router.put("/regras/:id", atualizarRegra);
router.delete("/regras/:id", deletarRegra);
router.get("/ranking", obterRankingEHistorico);

module.exports = router;
