const express = require('express');
const router = express.Router();
const saasCartaoController = require('../controllers/saasCartaoController');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

// Todas as rotas de cartão são protegidas por autenticação e isoladas por tenant (empresa_id)
router.get('/meu-cartao', auth, tenant, saasCartaoController.getMeuCartao);
router.post('/salvar', auth, tenant, saasCartaoController.salvarCartao);
router.delete('/remover', auth, tenant, saasCartaoController.removerCartao);
router.put('/toggle-debito', auth, tenant, saasCartaoController.toggleDebitoAutomatico);
router.post('/pagar-fatura/:faturaId', auth, tenant, saasCartaoController.pagarFaturaComCartao);

module.exports = router;
