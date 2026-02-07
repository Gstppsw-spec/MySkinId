const express = require("express");
const router = express.Router();
const consultation = require("../../controllers/masterConsultation");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uploadPath = "uploads/consultation";
const { verifyToken } = require("../../middlewares/authMiddleware");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${path.extname(file.originalname)}`;

    cb(null, uniqueName);
  },
});

const uploadImageConsultation = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(verifyToken);

router.get("/room/readyToAssign", consultation.readyToAssign);

router.post("/room", consultation.createRoom);

router.get("/room/user", consultation.getRoomByUserDoctor);
router.get("/room/user/:id", consultation.getRoomByUser);
router.get("/room/:id", consultation.getByRoomId);
router.put("/room/:id/join", consultation.assignDoctor);
router.put("/room/:id/close", consultation.closeRoom);

router.post("/room/:id/message", consultation.addMessage);
router.post(
  "/room/:id/message/image",
  uploadImageConsultation.array("images", 10),
  consultation.addMessage,
);
router.put("/room/:id/message/read", consultation.readMessage);
router.get("/room/:id/messages", consultation.getMessagesByRoomId);
router.get("/room/:id/media", consultation.getMediaByRoomId);

router.post("/room/:id/prescription", consultation.addPrescription);
router.get("/room/:id/prescriptions", consultation.getPrescriptionByRoomId);
router.get("/room/:id/allPrescriptionByOutlet", consultation.getAllPrescriptionByOutlet);

module.exports = router;
