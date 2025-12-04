const express = require("express");
const router = express.Router();
const subCategoryServiceController = require("../controllers/subCategoryServiceController");

router.get("/", subCategoryServiceController.getAllSubCategory);
router.get("/:id", subCategoryServiceController.getSubCategoryById);
router.post("/", subCategoryServiceController.createSubCategory);
router.put("/:id", subCategoryServiceController.updateSubCategory);
router.delete("/:id", subCategoryServiceController.deleteSubCategory);

module.exports = router;
