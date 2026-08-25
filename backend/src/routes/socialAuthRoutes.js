const express = require("express");
const router = express.Router();
const socialCtrl = require("../controllers/socialAuthController");

// Rotas públicas (usadas pelo captive portal)
router.get("/config", socialCtrl.getPublicOAuthConfig);
router.post("/google", socialCtrl.loginGoogle);
router.post("/facebook", socialCtrl.loginFacebook);

module.exports = router;
