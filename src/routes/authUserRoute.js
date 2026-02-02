const express = require("express");
const router = express.Router();
const authController = require("../controllers/authUserController");
router.post("/register-company", authController.register);
router.post("/login", authController.login);

module.exports = router;
