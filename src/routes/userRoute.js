const express = require("express");
const router = express.Router();
const authController = require("../controllers/authUserController");

router.post("/", authController.createUser);
router.get("/company/:companyId", authController.getUserByCompanyId);

router.get("/all-user", authController.getAllUser);
router.get("/:id", authController.getUserById);
router.put("/:id", authController.editUser);
router.delete("/:id", authController.deleteUser);
module.exports = router;
