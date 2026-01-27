const {
  masterConsultationMessage,
  masterRoomConsultation,
} = require("../models");

module.exports = (io, socket) => {
  socket.on("joinRoom", async ({ roomId }) => {
    const room = await masterRoomConsultation.findOne({
      where: { id: roomId },
    });
    if (!room) {
      return socket.emit("error", "Room not found");
    }
    socket.join(roomId);
    const messages = await masterConsultationMessage.findAll({
      where: { roomId },
      order: [["createdAt", "ASC"]],
    });
    socket.emit("history", messages);
  });

  socket.on("sendMessage", async ({ roomId, message }) => {
    const msg = await masterConsultationMessage.create({
      roomId,
      message,
    });
    io.to(roomId).emit("message", msg);
  });
};
