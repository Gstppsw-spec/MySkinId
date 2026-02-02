const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = "uploads/profile";

// Ensure folder exists
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
    const allowedMime = ["image/jpeg", "image/jpg", "image/png"];

    if (!allowedMime.includes(file.mimetype)) {
        return cb(
            new Error("Format gambar harus JPG / JPEG / PNG"),
            false
        );
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

module.exports = upload;
