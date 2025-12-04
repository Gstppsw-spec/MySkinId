const express = require("express");
const router = express.Router();
const productCategory = require("../../controllers/masterProductCategory");
const consultationCategory = require("../../controllers/masterConsultationCategory");
const groupProduct = require("../../controllers/masterGroupProduct");

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

router.get("/groups", groupProduct.getAll);
router.get("/group/:id", groupProduct.getById);
router.post("/groups", groupProduct.create);
router.put("/group/:id", groupProduct.update);

module.exports = router;
