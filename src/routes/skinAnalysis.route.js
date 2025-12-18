const express = require("express");
const router = express.Router();
const controller = require("../controllers/skinAnalysis.controller");
const multer = require("multer");
const path = require("path");

const fs = require("fs");
const uploadPath = "uploads/analyze";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const uploadSkinAnalysImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post(
  "/analyze",
  uploadSkinAnalysImage.single("image"),
  controller.analyzeSkin
);
router.get("/latest/:customerId", controller.getLatestAnalysis);

module.exports = router;
