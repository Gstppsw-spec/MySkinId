const express = require("express");
const router = express.Router();
const mainCategoryServiceController = require("../controllers/mainCategoryServiceController");

router.get("/", mainCategoryServiceController.getAllMainCategory);
router.get("/:id", mainCategoryServiceController.getMainCategoryById);
router.post("/", mainCategoryServiceController.createMainCategory);
router.put("/:id", mainCategoryServiceController.updateMainCategory);
router.delete("/:id", mainCategoryServiceController.deleteMainCategory);

module.exports = router;
