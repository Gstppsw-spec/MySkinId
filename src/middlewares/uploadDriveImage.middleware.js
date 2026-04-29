const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = "uploads/temp_drive";

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

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit for drive uploads
}).array("images", 10); // Allow up to 10 images

const uploadDriveImage = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          status: false,
          message: "Ukuran gambar terlalu besar (maksimal 10MB)",
        });
      }
      return res.status(400).json({
        status: false,
        message: err.message,
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

module.exports = uploadDriveImage;
