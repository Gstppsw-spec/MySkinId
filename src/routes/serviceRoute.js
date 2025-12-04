const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");

router.get("/product/v1", serviceController.getAllServiceProductByUserId);
router.get("/product", serviceController.getAllServiceProduct);
router.post("/product", serviceController.createServiceProduct);

router.get("/treatment/v1", serviceController.getAllServiceTreatmentByUserId);
router.get("/treatment", serviceController.getAllServiceTreatment);
router.post("/treatment", serviceController.createServiceTreatment);

router.get("/package/v1", serviceController.getAllServicePackageByUserId);
router.get("/package", serviceController.getAllServicePackage);
router.post("/package", serviceController.createServicePackage);
router.post("/package/item", serviceController.createPackageItem);
router.put("/package/item/:id", serviceController.updatePackageItem);

router.get("/nopackage", serviceController.getAllServiceNoPackageByUserId);

router.get("/:id", serviceController.getServiceById);
router.put("/:id", serviceController.updateService);
router.delete("/:id", serviceController.deleteService);

module.exports = router;
