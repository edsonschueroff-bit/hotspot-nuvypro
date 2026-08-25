const express = require("express");
const router = express.Router();
const npsController = require("../controllers/npsController");

// GET /api/nps
router.get("/", npsController.getNpsData);

module.exports = router;
