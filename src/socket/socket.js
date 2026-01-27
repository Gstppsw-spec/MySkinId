const { Server } = require("socket.io");
const chatHandler = require("./chat.handler");

module.exports = function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    chatHandler(io, socket);
  });
};
