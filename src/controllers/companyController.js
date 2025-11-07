const Mscompany = require("../models/companyModel");
const Mslocation = require("../models/locationModel");
const MsRole = require("../models/roleModel");
const MsUser = require("../models/userModel");

exports.createCompany = async (req, res) => {
  try {
    const data = await Mscompany.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllCompaniesByUserId = async (req, res) => {
  const userId = req.headers.userid;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Missing user ID in request header",
    });
  }

  try {
    const user = await MsUser.findOne({
      where: { id: userId },
      include: [{ model: MsRole, as: "role" }],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let whereCondition = {};

    if (user.role?.isSuperAdmin) {
      whereCondition = {};
    } else if (user.role?.isAdminCompany) {
      if (!user.companyid) {
        return res.status(400).json({
          success: false,
          message: "User has no company assigned",
        });
      }
      whereCondition = { id: user.companyid };
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }

    const data = await Mscompany.findAll({
      where: whereCondition,
      include: [{ model: Mslocation, as: "locations" }],
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Mscompany.findByPk(id, {
      include: [{ model: Mslocation, as: "locations" }],
    });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Mscompany.update(req.body, { where: { id } });
    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    const data = await Mscompany.findByPk(id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Mscompany.destroy({ where: { id } });
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    res
      .status(200)
      .json({ success: true, message: "Company deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
