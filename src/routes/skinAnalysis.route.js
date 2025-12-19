const express = require("express");
const router = express.Router();
const controller = require("../controllers/skinAnalysis.controller");

const {
  uploadSkinImage,
  autoFixImage,
  validateFinalSize,
} = require("../middlewares/uploadSkinImage.middleware");

router.post(
  "/analyze",
  uploadSkinImage,
  autoFixImage,
  validateFinalSize,
  controller.analyzeSkin
);

router.get("/latest/:customerId", controller.getLatestAnalysis);

module.exports = router;
