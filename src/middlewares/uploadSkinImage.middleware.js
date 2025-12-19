const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const uploadPath = "uploads/analyze";

// pastikan folder ada
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

/* =======================
   MULTER STORAGE
======================= */
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

/* =======================
   FILE FILTER
======================= */
const fileFilter = (req, file, cb) => {
  const allowedMime = ["image/jpeg", "image/jpg", "image/png"];
  const allowedExt = [".jpg", ".jpeg", ".png"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMime.includes(file.mimetype) || !allowedExt.includes(ext)) {
    return cb(
      new Error("Format gambar harus JPG / JPEG / PNG"),
      false
    );
  }

  cb(null, true);
};

/* =======================
   MULTER INSTANCE
======================= */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (awal)
  },
}).single("image");

/* =======================
   HANDLE MULTER ERROR
======================= */
const uploadSkinImage = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        status: false,
        message: "Ukuran gambar maksimal 10MB",
      });
    } else if (err) {
      return res.status(400).json({
        status: false,
        message: err.message,
      });
    }
    next();
  });
};

/* =======================
   AUTO RESIZE & COMPRESS
======================= */
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

    if (width < 200 || height < 200) {
      fs.unlinkSync(inputPath);
      return res.status(400).json({
        status: false,
        message: "Resolusi gambar minimal 200x200 px",
      });
    }

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

/* =======================
   FINAL SIZE VALIDATION
======================= */
const validateFinalSize = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      status: false,
      message: "File tidak valid",
    });
  }

  const size = fs.statSync(req.file.path).size;

  if (size > 2 * 1024 * 1024) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      status: false,
      message: "Gambar terlalu besar (maksimal 2MB)",
    });
  }

  next();
};

module.exports = {
  uploadSkinImage,
  autoFixImage,
  validateFinalSize,
};
