const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const tenant = require("../middleware/tenant");
const checkPermissao = require("../middleware/checkPermissao");
const {
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  deletarCategoria,
  listarProdutos,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  obterCardapioPublico
} = require("../controllers/cardapioController");

// Rota pública de consulta do cardápio por slug
router.get("/public/:empresaSlug", obterCardapioPublico);

// Rotas protegidas admin
router.use(auth, tenant, checkPermissao("portais"));

// Categorias
router.get("/categorias", listarCategorias);
router.post("/categorias", criarCategoria);
router.put("/categorias/:id", atualizarCategoria);
router.delete("/categorias/:id", deletarCategoria);

// Produtos
router.get("/produtos", listarProdutos);
router.post("/produtos", criarProduto);
router.put("/produtos/:id", atualizarProduto);
router.delete("/produtos/:id", deletarProduto);

module.exports = router;
