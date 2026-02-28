const {
  masterConsultationMessage,
  masterRoomConsultation,
} = require("../models");
const consultationService = require("../services/masterConsultation");

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

  socket.on("sendMessage", async ({ roomId, message, messageType, senderRole }) => {
    try {
      const result = await consultationService.addMessage({
        roomId,
        message,
        messageType: messageType || "text",
        senderRole,
      }, []); // No files for now via socket

      if (!result.status) {
        return socket.emit("error", result.message);
      }
      // Note: addMessage service already emits "message" to the room
    } catch (error) {
      socket.emit("error", error.message);
    }
  });
};
