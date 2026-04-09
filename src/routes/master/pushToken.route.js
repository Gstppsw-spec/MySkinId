const express = require("express");
const router = express.Router();
const pushTokenController = require("../../controllers/pushToken.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");

router.use(verifyToken);

// Register or update push token
router.post("/", pushTokenController.registerToken);

// Remove/deactivate push token (e.g. on logout)
router.delete("/", pushTokenController.removeToken);

module.exports = router;
