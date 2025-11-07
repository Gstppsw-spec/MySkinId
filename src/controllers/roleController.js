const MsRole = require("../models/roleModel");
const MsUser = require("../models/userModel");

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await MsRole.findAll();
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch roles" });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const role = await MsRole.findByPk(req.params.id);
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }
    res.json({ success: true, data: role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch role" });
  }
};

exports.createRole = async (req, res) => {
  try {
    const newRole = await MsRole.create(req.body);
    res.status(201).json({ success: true, data: newRole });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: "Failed to create role" });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await MsRole.findByPk(id);

    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    await role.update(req.body);
    res.json({ success: true, data: role });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: "Failed to update role" });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await MsRole.findByPk(id);

    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    await role.destroy();
    res.json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: "Failed to delete role" });
  }
};

exports.getRoleByUserId = async (req, res) => {
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
      whereCondition = { isAdminOutlet: true };
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }
    const roles = await MsRole.findAll({
      where: whereCondition,
    });
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch role" });
  }
};
