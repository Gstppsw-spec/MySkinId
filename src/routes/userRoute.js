const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateJWT } = require("../middlewares/authMiddleware");

router.get("/v1", authenticateJWT, userController.getAllUsersByUserId);
router.post("/", authenticateJWT, userController.createUser);
router.get("/", authenticateJWT, userController.getAllUsers);
router.get("/:id", authenticateJWT, userController.getUserById);
router.put("/:id", authenticateJWT, userController.updateUser);
router.delete("/:id", authenticateJWT, userController.deleteUser);
router.post("/login", userController.loginUser);

module.exports = router;
