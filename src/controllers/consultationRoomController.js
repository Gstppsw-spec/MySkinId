const { nanoid } = require("nanoid");
const ConsultationRoom = require("../models/roomConsultationModel");
const ConsultationMessage = require("../models/consultationMessageModel");
const ConsultationPrescription = require("../models/consultationResepModel");
const { Sequelize } = require("sequelize");
const ConsultationCategory = require("../models/consultationCategoryModel");

// Ambil semua room untuk user atau dokter
exports.getRoomsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const rooms = await ConsultationRoom.findAll({
      where: {
        [Sequelize.Op.or]: [{ customerid: userId }, { doctorid: userId }],
      },
      include: [{ model: ConsultationCategory, as: "categoryconsultation" }],
    });
    return res.json({ status: "success", data: rooms });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Ambil detail room by id
exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(id);

    const room = await ConsultationRoom.findByPk(id, {
      include: [{ model: ConsultationCategory, as: "categoryconsultation" }],
      // include: [

      //   { model: ConsultationMessage, as: "messages" },
      //   { model: ConsultationPrescription, as: "prescriptions" },
      // ],
    });

    if (!room) {
      return res
        .status(404)
        .json({ status: "error", message: "Room tidak ditemukan" });
    }

    return res.json({ status: "success", data: room });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Assign dokter ke room (join)
exports.assignDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorid } = req.body;

    const room = await ConsultationRoom.findByPk(id);
    if (!room)
      return res
        .status(404)
        .json({ status: "error", message: "Room tidak ditemukan" });

    room.doctorid = doctorid;
    room.status = "open";
    await room.save();

    return res.json({ status: "success", data: room });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Close room
exports.closeRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await ConsultationRoom.findByPk(id);
    if (!room)
      return res
        .status(404)
        .json({ status: "error", message: "Room tidak ditemukan" });

    room.status = "closed";
    await room.save();

    return res.json({ status: "success", message: "Room telah ditutup" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Buat room baru
exports.createRoom = async (req, res) => {
  try {
    const { customerid, categoryid } = req.body;

    if (!customerid) {
      return res
        .status(400)
        .json({ status: "error", message: "Customer ID dibutuhkan" });
    }

    const roomcode = `ROOM-${nanoid(8).toUpperCase()}`;

    const room = await ConsultationRoom.create({
      customerid,
      roomcode,
      doctorid: null,
      status: "pending",
      categoryid,
    });

    return res.json({ status: "success", data: room });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
