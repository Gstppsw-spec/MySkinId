const express = require("express");
const router = express.Router();
const controller = require("../../controllers/requestVerificationController");

// CRUD
router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.detail);
router.put("/:id", controller.update);

module.exports = router;
