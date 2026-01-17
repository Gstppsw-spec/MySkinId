const express = require("express");
const router = express.Router();
const authController = require("../controllers/authUserController");

router.post("/", authController.createUser);
router.get("/company/:companyId", authController.getUserByCompanyId);

module.exports = router;
