let _io = null;

module.exports = {
    setIO(io) {
        _io = io;
    },
    getIO() {
        return _io;
    },
    emitPaymentUpdate(orderNumber, status, data = {}) {
        if (_io) {
            _io.to(`payment:${orderNumber}`).emit("payment_update", {
                orderNumber,
                paymentStatus: status,
                ...data,
            });
        }
    },
};
