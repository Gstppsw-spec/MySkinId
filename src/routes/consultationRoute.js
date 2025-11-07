// routes/consultationRoutes.js
const express = require("express");
const router = express.Router();

// Import controllers
const roomCtrl = require("../controllers/consultationRoomController");
const messageCtrl = require("../controllers/constultationMessageController");
const prescriptionCtrl = require("../controllers/consultationPrescriptionController");
const upload = require("../middlewares/uploadMultipleFile");

// Room routes
router.post("/room", roomCtrl.createRoom);
router.get("/room/user/:userId", roomCtrl.getRoomsByUser); // userId
router.get("/room/:id", roomCtrl.getRoomById); // harus dibuat
router.put("/room/:id/join", roomCtrl.assignDoctor); // join = assign doctor
router.put("/room/:id/close", roomCtrl.closeRoom); // harus dibuat

// Message routes
router.post("/room/:id/message", messageCtrl.addMessage);
router.get("/room/:id/messages", messageCtrl.getMessagesByRoom);
router.get("/room/:id/media", messageCtrl.getMediaByRoom);
router.post(
  "/room/:id/message/image",
  upload.array("images", 10),
  messageCtrl.addMessage
);

// Prescription routes
router.post("/room/:id/prescription", prescriptionCtrl.addPrescription);
router.get("/room/:id/prescriptions", prescriptionCtrl.getPrescriptionByRoom);

module.exports = router;
