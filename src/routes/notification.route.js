const express = require("express");
const router = express.Router();
const NotificationController = require("../controllers/notification.controller");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware.verifyToken, NotificationController.list);
router.put("/:id/read", authMiddleware.verifyToken, NotificationController.markAsRead);
router.put("/read-all", authMiddleware.verifyToken, NotificationController.markAllAsRead);

module.exports = router;
