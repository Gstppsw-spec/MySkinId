const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  uploadImage,
  getAllImages,
  getImagesByLocation,
  deleteImage,
} = require("../controllers/imageLocationController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/upload", upload.single("image"), uploadImage);
router.get("/", getAllImages);
router.get("/:locationid", getImagesByLocation);
router.delete("/:id", deleteImage);

module.exports = router;
