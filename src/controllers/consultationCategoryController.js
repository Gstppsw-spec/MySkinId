// controllers/consultationCategoryController.js
const ConsultationCategory = require("../models/consultationCategoryModel");

// Tambah kategori baru
exports.addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ status: "error", message: "Nama kategori dibutuhkan" });
    }

    const category = await ConsultationCategory.create({
      name,
      description: description || null,
    });

    return res.json({ status: "success", data: category });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Ambil semua kategori
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await ConsultationCategory.findAll({
      where: { isactive: true },
      order: [["updatedate", "DESC"]],
    });

    return res.json({ status: "success", data: categories });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Ambil satu kategori berdasarkan ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await ConsultationCategory.findByPk(id);
    if (!category)
      return res.status(404).json({ status: "error", message: "Kategori tidak ditemukan" });

    return res.json({ status: "success", data: category });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Update kategori
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isactive } = req.body;

    const category = await ConsultationCategory.findByPk(id);
    if (!category)
      return res.status(404).json({ status: "error", message: "Kategori tidak ditemukan" });

    category.name = name || category.name;
    category.description = description ?? category.description;
    category.isactive = isactive ?? category.isactive;
    await category.save();

    return res.json({ status: "success", data: category });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Hapus kategori
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await ConsultationCategory.findByPk(id);
    if (!category)
      return res.status(404).json({ status: "error", message: "Kategori tidak ditemukan" });

    await category.destroy();

    return res.json({ status: "success", message: "Kategori berhasil dihapus" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
