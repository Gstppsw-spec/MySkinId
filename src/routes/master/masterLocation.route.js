const express = require("express");
const router = express.Router();
const MasterLocationController = require("../../controllers/masterLocation.controller");
const uploadLocationImages = require("../../middlewares/uploadMultipleImageLocation");

router.get("/", MasterLocationController.list);
router.get("/:id", MasterLocationController.detail);
router.get("/company/:companyId", MasterLocationController.getByCompanyId);
router.post(
  "/",
  uploadLocationImages.array("photos", 10),
  MasterLocationController.create
);
router.put(
  "/:id",
  uploadLocationImages.array("photos", 10),
  MasterLocationController.update
);
router.patch("/:id/status", MasterLocationController.updateStatus);
router.patch("/image/:id", MasterLocationController.deleteImage);
router.get("/user/:id", MasterLocationController.getLocationByUserId);

module.exports = router;
