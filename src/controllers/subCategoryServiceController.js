const MsSubServiceCategory = require("../models/subCategoryServiceModel");

exports.getAllSubCategory = async (req, res) => {
  try {
    const subCategory = await MsSubServiceCategory.findAll();
    res.json({ success: true, data: subCategory });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch sub category" });
  }
};

exports.getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await MsSubServiceCategory.findByPk(req.params.id);
    if (!subCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Sub Category not found" });
    }
    res.json({ success: true, data: subCategory });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch sub category" });
  }
};

exports.createSubCategory = async (req, res) => {
  try {
    const newSubCategory = await MsSubServiceCategory.create(req.body);
    res.status(201).json({ success: true, data: newSubCategory });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ success: false, message: "Failed to create subCategory" });
  }
};

exports.updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const subCategory = await MsSubServiceCategory.findByPk(id);

    if (!subCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Sub Category not found" });
    }

    await subCategory.update(req.body);
    res.json({ success: true, data: subCategory });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ success: false, message: "Failed to update subCategory" });
  }
};

exports.deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const subCategory = await MsSubServiceCategory.findByPk(id);

    if (!subCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Sub Category not found" });
    }

    await subCategory.destroy();
    res.json({ success: true, message: "Sub Category deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ success: false, message: "Failed to delete subCategory" });
  }
};
