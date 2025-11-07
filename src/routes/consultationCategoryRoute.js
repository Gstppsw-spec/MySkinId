const express = require("express");
const router = express.Router();

// Import controller
const categoryCtrl = require("../controllers/consultationCategoryController");

// CRUD Routes
router.post("/", categoryCtrl.addCategory);            // Tambah kategori
router.get("/", categoryCtrl.getAllCategories);        // Ambil semua kategori
router.get("/:id", categoryCtrl.getCategoryById);      // Ambil kategori berdasarkan ID
router.put("/:id", categoryCtrl.updateCategory);       // Update kategori
router.delete("/:id", categoryCtrl.deleteCategory);    // Hapus kategori

module.exports = router;
