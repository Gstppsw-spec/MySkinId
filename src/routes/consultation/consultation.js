const express = require("express");
const router = express.Router();
const consultation = require("../../controllers/masterConsultation");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uploadPath = "uploads/consultation";
const { verifyToken } = require("../../middlewares/authMiddleware");
const compressImage = require("../../middlewares/compressImage");

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

const { allowRoles } = require("../../middlewares/roleMiddleware");

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
  compressImage,
  consultation.addMessage,
);
router.put("/room/:id/message/read", consultation.readMessage);
router.get("/room/:id/messages", consultation.getMessagesByRoomId);
router.get("/room/:id/media", consultation.getMediaByRoomId);

router.put("/room/:id/updateLocation", consultation.updateLocation);
router.put("/room/:id/updateLatLng", consultation.updateLatLng);

router.post("/room/:id/prescription", consultation.addPrescription);
router.get("/room/:id/prescriptions", consultation.getPrescriptionByRoomId);
router.get("/room/:id/allPrescriptionByOutlet", consultation.getAllPrescriptionByOutlet);
router.delete("/room/:roomId/prescriptions", consultation.deletePrescriptionsByRoomId);
router.delete("/prescription/:id", consultation.deletePrescription);

router.post("/room/:id/recommendation", allowRoles("OUTLET_ADMIN", "SUPER_ADMIN", "DOCTOR_GENERAL", "OUTLET_DOCTOR"), consultation.addRecommendation);
router.get(
  "/room/:id/recommendation",
  allowRoles("OUTLET_ADMIN", "SUPER_ADMIN", "DOCTOR_GENERAL", "OUTLET_DOCTOR"),
  consultation.getRecommendationDetail
);
router.get("/room/:id/recommendations", consultation.getRecommendations);

module.exports = router;
