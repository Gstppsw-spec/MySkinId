const ConsultationPrescription = require("../models/consultationResepModel");

exports.addPrescription = async (req, res) => {
  try {
    const { roomid, productid, description } = req.body;

    if (!roomid || !description) {
      return res
        .status(400)
        .json({ status: "error", message: "Data resep tidak lengkap" });
    }

    const prescription = await ConsultationPrescription.create({
      roomid,
      productid: productid || null,
      description,
    });

    return res.json({ status: "success", data: prescription });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getPrescriptionByRoom = async (req, res) => {
  try {
    const { roomid } = req.params;

    const prescriptions = await ConsultationPrescription.findAll({
      where: { roomid },
      order: [["createdAt", "ASC"]],
    });

    return res.json({ status: "success", data: prescriptions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
