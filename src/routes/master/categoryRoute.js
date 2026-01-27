const express = require("express");
const router = express.Router();
const productCategory = require("../../controllers/masterProductCategory");
const consultationCategory = require("../../controllers/masterConsultationCategory");
const groupProduct = require("../../controllers/masterGroupProduct");
const serviceCategory = require("../../controllers/masterCategoryService");

// Product Category
router.get("/products", productCategory.getAll);
router.get("/product/:id", productCategory.getById);
router.post("/products", productCategory.create);
router.put("/product/:id", productCategory.update);

// Consultation Category
router.get("/consultations", consultationCategory.getAll);
router.get("/consultation/:id", consultationCategory.getById);
router.post("/consultations", consultationCategory.create);
router.put("/consultation/:id", consultationCategory.update);

//Product group
router.get("/groups", groupProduct.getAll);
router.get("/group/:id", groupProduct.getById);
router.post("/groups", groupProduct.create);
router.put("/group/:id", groupProduct.update);

//Service main category
router.get("/service-main", serviceCategory.getAllMainServiceCategory);
router.get("/service-main/:id", serviceCategory.getMainServiceCategoryById);
router.post("/service-main", serviceCategory.createMainServiceCategory);
router.put("/service-main/:id", serviceCategory.updateMainServiceCategory);

//service sub category
router.get("/service-sub", serviceCategory.getAllSubServiceCategory);
router.get("/service-sub/:id", serviceCategory.getSubServiceCategoryById);
router.post("/service-sub", serviceCategory.createSubServiceCategory);
router.put("/service-sub/:id", serviceCategory.updateSubServiceCategory);

module.exports = router;
