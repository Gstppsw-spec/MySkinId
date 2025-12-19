const express = require("express");
const router = express.Router();
const controller = require("../controllers/skinAnalysis.controller");
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");


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

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png"];
  if (!allowed.includes(file.mimetype)) {
    return res.status(400).json({
      status: false,
      message: "Format gambar harus JPG / JPEG",
    });
  }
  cb(null, true);
};

const uploadSkinAnalysImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const autoFixImage = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      status: false,
      message: "Image tidak ditemukan",
    });
  }

  const inputPath = req.file.path;
  const tempPath = inputPath + ".tmp";

  try {
    const image = sharp(inputPath);
    const meta = await image.metadata();

    let { width, height } = meta;

    // ❌ terlalu kecil
    if (width < 200 || height < 200) {
      fs.unlinkSync(inputPath);
      return res.status(400).json({
        status: false,
        message: "Resolusi gambar terlalu kecil (minimal 200x200 px)",
      });
    }

    // 📐 resize kalau terlalu besar
    if (width > 4096 || height > 4096) {
      const ratio = Math.min(4096 / width, 4096 / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    await image
      .resize(width, height)
      .jpeg({
        quality: 80,
        mozjpeg: true,
      })
      .toFile(tempPath);

    fs.unlinkSync(inputPath);
    fs.renameSync(tempPath, inputPath);

    next();
  } catch (err) {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return res.status(400).json({
      status: false,
      message: "Gagal memproses gambar",
    });
  }
};

const validateFinalSize = (req, res, next) => {
  const size = fs.statSync(req.file.path).size;
  if (size > 2 * 1024 * 1024) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      status: false,
      message: "Gambar terlalu besar meskipun sudah dikompres (maks 2MB)",
    });
  }
  next();
};

router.post(
  "/analyze",
  uploadSkinAnalysImage.single("image"),
  autoFixImage,
  validateFinalSize,
  controller.analyzeSkin
);
router.get("/latest/:customerId", controller.getLatestAnalysis);

module.exports = router;
