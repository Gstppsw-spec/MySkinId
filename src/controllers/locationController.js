const db = require("../models");
const { Mslocation, ImageLocation, Mscompany, MsRole, MsUser } = db;


exports.getAllLocations = async (req, res) => {
  try {
    const locations = await Mslocation.findAll({
      include: [
        { model: ImageLocation, as: "imagelocation" }, // gambar outlet
        { model: Mscompany, as: "company", attributes: ["id", "name", "code"] }, // company
      ],
      order: [["updatedate", "DESC"]],
    });

    res.json({ success: true, data: locations });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch locations" });
  }
};

exports.getAllLocationByUserId = async (req, res) => {
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
      whereCondition = { companyid: user.companyid };
    } else if (user.role?.isAdminOutlet) {
      if (!user.locationid) {
        return res.status(400).json({
          success: false,
          message: "User has no location assigned",
        });
      }
      whereCondition = { id: user.locationid };
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }
    const locations = await Mslocation.findAll({
      where: whereCondition,
      include: [
        { model: ImageLocation, as: "imagelocation" },
        { model: MsCompany, as: "company", attributes: ["id", "name", "code"] },
      ],
      order: [["updatedate", "DESC"]],
    });

    res.json({ success: true, data: locations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch locations",
      error: error.message,
    });
  }
};

exports.getLocationById = async (req, res) => {
  try {
    const location = await Mslocation.findByPk(req.params.id);
    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }
    res.json({ success: true, data: location });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch location" });
  }
};

exports.createLocation = async (req, res) => {
  try {
    const newLocation = await Mslocation.create(req.body);
    res.status(201).json({ success: true, data: newLocation });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ success: false, message: "Failed to create location" });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const location = await Mslocation.findByPk(id);

    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    await location.update(req.body);
    res.json({ success: true, data: location });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ success: false, message: "Failed to update location" });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const location = await Mslocation.findByPk(id);

    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    await location.destroy();
    res.json({ success: true, message: "Location deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ success: false, message: "Failed to delete location" });
  }
};
