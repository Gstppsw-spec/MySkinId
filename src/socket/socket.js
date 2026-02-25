const { Server } = require("socket.io");
const chatHandler = require("./chat.handler");
const socketInstance = require("./socketInstance");

module.exports = function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  // Register globally so services can emit events
  socketInstance.setIO(io);

  io.on("connection", (socket) => {
    chatHandler(io, socket);

    // Payment room: frontend joins with orderNumber to receive payment updates
    socket.on("join_payment_room", (orderNumber) => {
      socket.join(`payment:${orderNumber}`);
    });

    socket.on("leave_payment_room", (orderNumber) => {
      socket.leave(`payment:${orderNumber}`);
    });
  });
};
