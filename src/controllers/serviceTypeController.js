
const MsService = require("../models/serviceModel");
const MsServiceType = require("../models/serviceTypeModel");

exports.createServiceType = async (req, res) => {
  try {
    const data = await MsServiceType.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllServiceType = async (req, res) => {
  try {
    const data = await MsServiceType.findAll({
      include: [{ model: MsService, as: "services" }],
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getServiceTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await MsServiceType.findByPk(id, {
      include: [{ model: MsService, as: "services" }],
    });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Service type not found" });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
