const express = require("express");
const router = express.Router();
const crmController = require("../controllers/crmController");
const crmIaController = require("../controllers/crmIaController");

// Contatos
router.get("/contatos", crmController.getContatos);

// IA Assistente no WhatsApp
router.get("/ia-config", crmIaController.getIaConfig);
router.post("/ia-config", crmIaController.saveIaConfig);

// Templates
router.get("/templates", crmController.getTemplates);
router.post("/templates", crmController.createTemplate);
router.put("/templates/:id", crmController.updateTemplate);
router.delete("/templates/:id", crmController.deleteTemplate);

// Histórico de Envios
router.get("/historico", crmController.getHistorico);
router.post("/enviar", crmController.registrarEnvio);
router.post("/disparar-email", crmController.dispararEmailMassa);

// Automações de Marketing
router.get("/automacoes", crmController.getAutomacoes);
router.post("/automacoes", crmController.saveAutomacao);

// Central de Atendimento (Chat em Tempo Real - Nível 3)
router.get("/chat/conversas", crmController.getConversas);
router.get("/chat/mensagens/:telefone", crmController.getMensagensChat);
router.post("/chat/enviar", crmController.enviarMensagemChat);

// Webhook de mensagens recebidas WhatsApp Evolution API
router.post("/webhook", crmController.receberWebhookWhatsapp);

module.exports = router;
