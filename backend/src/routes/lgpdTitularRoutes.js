const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const checkPermissao = require("../middleware/checkPermissao");
const {
  solicitarOtp,
  consultarDados,
  anonimizarDados,
  listarSolicitacoesAdmin
} = require("../controllers/lgpdTitularController");

// Rotas públicas do Portal do Titular
router.post("/solicitar-otp", solicitarOtp);
router.post("/consultar-dados", consultarDados);
router.post("/anonimizar", anonimizarDados);

// Rota protegida para auditoria no painel Admin
router.get("/solicitacoes", auth, tenant, checkPermissao("compliance"), listarSolicitacoesAdmin);

module.exports = router;
