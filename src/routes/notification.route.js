const express = require("express");
const router = express.Router();
const NotificationController = require("../controllers/notification.controller");
const authMiddleware = require("../middlewares/authMiddleware");

const { allowRoles } = require("../middlewares/roleMiddleware");

router.get("/", authMiddleware.verifyToken, NotificationController.list);
router.put("/:id/read", authMiddleware.verifyToken, NotificationController.markAsRead);
router.put("/read-all", authMiddleware.verifyToken, NotificationController.markAllAsRead);

// ── Super Admin — Manage Broadcast/Scheduled General Notifications ──
router.post(
  "/send-broadcast",
  authMiddleware.verifyToken,
  allowRoles("SUPER_ADMIN", "MARKETING"),
  NotificationController.sendGeneralBroadcast
);

router.get(
  "/scheduled",
  authMiddleware.verifyToken,
  allowRoles("SUPER_ADMIN", "MARKETING"),
  NotificationController.getScheduledGeneralNotifications
);

router.delete(
  "/scheduled/:notificationId",
  authMiddleware.verifyToken,
  allowRoles("SUPER_ADMIN", "MARKETING"),
  NotificationController.deleteScheduledGeneralNotification
);

router.put(
  "/scheduled/:notificationId",
  authMiddleware.verifyToken,
  allowRoles("SUPER_ADMIN", "MARKETING"),
  NotificationController.updateScheduledGeneralNotification
);

router.put(
  "/scheduled/:notificationId/toggle",
  authMiddleware.verifyToken,
  allowRoles("SUPER_ADMIN", "MARKETING"),
  NotificationController.toggleScheduledNotification
);

module.exports = router;
