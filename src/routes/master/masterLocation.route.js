const express = require("express");
const router = express.Router();
const MasterLocationController = require("../../controllers/masterLocation.controller");
const uploadLocationImages = require("../../middlewares/uploadMultipleImageLocation");

// >>> STATIC ROUTES FIRST <<<
router.get("/company/:companyId", MasterLocationController.getByCompanyId);
router.get("/user/:id", MasterLocationController.getLocationByUserId);

// CUSTOMER LIST
router.get("/all-customer", MasterLocationController.listLocationByCustomer);
router.get(
  "/all-customer/:customerId",
  MasterLocationController.listLocationByCustomer
);

// DETAIL CUSTOMER
router.get(
  "/:id/detail-customer/:customerId",
  MasterLocationController.detailLocationByCustomer
);
router.get(
  "/:id/detail-customer",
  MasterLocationController.detailLocationByCustomer
);

// UPDATE & MANAGE
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

// >>> DYNAMIC ROUTES LAST <<<
router.get("/", MasterLocationController.list);
router.get("/:id", MasterLocationController.detail);

module.exports = router;
