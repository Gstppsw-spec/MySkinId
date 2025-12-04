const MsMainServiceCategory = require("../models/mainCategoryServiceModel");
const MsSubServiceCategory = require("../models/subCategoryServiceModel");

exports.createMainCategory = async (req, res) => {
  try {
    const data = await MsMainServiceCategory.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllMainCategory = async (req, res) => {
  try {
    const data = await MsMainServiceCategory.findAll({
      include: [{ model: MsSubServiceCategory, as: "subservicecategory" }],
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMainCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await MsMainServiceCategory.findByPk(id, {
      include: [{ model: MsSubServiceCategory, as: "subservicecategory" }],
    });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Main Category not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMainCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await MsMainServiceCategory.update(req.body, {
      where: { id },
    });
    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Main Category not found" });
    const data = await MsMainServiceCategory.findByPk(id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMainCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await MsMainServiceCategory.destroy({ where: { id } });
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Main Category  not found" });
    res
      .status(200)
      .json({ success: true, message: "Main Category  deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
