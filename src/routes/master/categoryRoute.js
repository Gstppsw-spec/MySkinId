const express = require("express");
const router = express.Router();
const productCategory = require("../../controllers/masterProductCategory");
const consultationCategory = require("../../controllers/masterConsultationCategory");
const compressImage = require("../../middlewares/compressImage");
const groupProduct = require("../../controllers/masterGroupProduct");
const serviceCategory = require("../../controllers/masterCategoryService");
const { optionalAuth } = require("../../middlewares/authMiddleware");

// Product Category
router.get("/products", productCategory.getAll);
router.get("/product/:id", productCategory.getById);
router.post("/products", productCategory.create);
router.put("/product/:id", productCategory.update);
router.delete("/product/:id", productCategory.delete);

// Consultation Category
router.get("/consultations", optionalAuth, consultationCategory.getAll);
router.get("/consultation/:id", consultationCategory.getById);
router.post("/consultations", consultationCategory.upload, compressImage, consultationCategory.create);
router.put("/consultation/:id", consultationCategory.upload, compressImage, consultationCategory.update);
router.delete("/consultation/:id", consultationCategory.delete);

//Product group
router.get("/groups", groupProduct.getAll);
router.get("/group/:id", groupProduct.getById);
router.post("/groups", groupProduct.create);
router.put("/group/:id", groupProduct.update);
router.delete("/group/:id", groupProduct.delete);

//Service main category
router.get("/service-main", serviceCategory.getAllMainServiceCategory);
router.get("/service-main/:id", serviceCategory.getMainServiceCategoryById);
router.post("/service-main", serviceCategory.createMainServiceCategory);
router.put("/service-main/:id", serviceCategory.updateMainServiceCategory);
router.delete("/service-main/:id", serviceCategory.deleteMainServiceCategory);

//service sub category
router.get("/service-sub", serviceCategory.getAllSubServiceCategory);
router.get("/service-sub/:id", serviceCategory.getSubServiceCategoryById);
router.post("/service-sub", serviceCategory.createSubServiceCategory);
router.put("/service-sub/:id", serviceCategory.updateSubServiceCategory);
router.delete("/service-sub/:id", serviceCategory.deleteSubServiceCategory);

module.exports = router;
