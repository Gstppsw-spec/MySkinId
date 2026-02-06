const express = require("express");
const router = express.Router();
const rating = require("../controllers/customerRating");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uploadPath = "uploads/rating";
const { verifyToken } = require("../middlewares/authMiddleware");

router.use(verifyToken);

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

const uploadImageReview = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.post(
  "/",
  uploadImageReview.array("images", 10),
  rating.createOrUpdateRating
);

router.patch("/image/:id", rating.deleteImage);
router.post("/like/:ratingId", rating.toggleLike);
router.get("/:entityId", rating.getByEntity);
router.delete("/:id", rating.deleteRating);


module.exports = router;
