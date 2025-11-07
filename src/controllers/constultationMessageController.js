const ConsultationMessage = require("../models/consultationMessageModel");
const ConsultationImage = require("../models/consultationImageModel");

exports.addMessage = async (req, res) => {
  try {
    const { roomid, messageType, message, senderrole } = req.body;

    if (!roomid || !messageType) {
      return res.status(400).json({
        status: "error",
        message: "roomid dan messageType wajib diisi",
      });
    }

    let messageContent = message || "";

    const newMessage = await ConsultationMessage.create({
      roomid,
      messageType,
      message: messageContent,
      senderrole,
    });

    if (req.files || req.files.length > 0) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const imageRecords = req.files.map((file) => ({
        messageid: newMessage.id,
        roomid: roomid,
        image_url: `${baseUrl}/uploads/consultation/${file.filename}`,
      }));

      await ConsultationImage.bulkCreate(imageRecords);

      messageContent = imageRecords.map((img) => img.image_url);
      newMessage.message = JSON.stringify(messageContent);
    }

    return res.json({
      status: "success",
      data: newMessage,
    });
  } catch (err) {
    console.error("Error addMessage:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getMessagesByRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await ConsultationMessage.findAll({
      where: { roomid: id },
      include: [{ model: ConsultationImage, as: "consultationimage" }],
      order: [["createdate", "ASC"]],
    });

    return res.json({ status: "success", data: messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getMediaByRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await ConsultationImage.findAll({
      where: { roomid: id },
    });

    return res.json({ status: "success", data: media });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
