const express = require("express");
const router = express.Router();
const saasPlanoController = require("../controllers/saasPlanoController");

router.get("/", saasPlanoController.getPlanos);
router.get("/:id", saasPlanoController.getPlanoById);
router.post("/", saasPlanoController.criarPlano);
router.put("/:id", saasPlanoController.atualizarPlano);
router.delete("/:id", saasPlanoController.deletarPlano);

module.exports = router;
