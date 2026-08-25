const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiroController');
const auth = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(auth);

// Rotas de DRE
router.get('/dre', financeiroController.getDre);

// Rotas de Despesas Operacionais (CRUD)
router.get('/despesas', financeiroController.getDespesas);
router.post('/despesas', financeiroController.createDespesa);
router.put('/despesas/:id', financeiroController.updateDespesa);
router.delete('/despesas/:id', financeiroController.deleteDespesa);

module.exports = router;
