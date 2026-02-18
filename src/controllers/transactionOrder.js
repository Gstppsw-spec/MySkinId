const transactionOrder = require("../services/transactionOrder");
const response = require("../helpers/response");

module.exports = {
    async checkoutFromCart(req, res) {
        try {
            const userId = req.user.id;
            const result = await transactionOrder.checkoutFromCart(req.body, userId);
            if (!result.status)
                return response.error(res, result.message, result.data);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async directCheckout(req, res) {
        try {
            const userId = req.user.id;
            const result = await transactionOrder.directCheckout(req.body, userId);
            if (!result.status)
                return response.error(res, result.message, result.data);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getTransactionStatus(req, res) {
        try {
            const userId = req.user.id;
            const { orderId } = req.params;
            const result = await transactionOrder.getTransactionStatus(orderId, userId);
            if (!result.status)
                return response.error(res, result.message, result.data);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async cancelOrder(req, res) {
        try {
            const userId = req.user.id;
            const { orderId } = req.body;
            const result = await transactionOrder.cancelOrder(orderId, userId);
            if (!result.status)
                return response.error(res, result.message, result.data);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async xenditCallback(req, res) {
        try {
            // Xendit sends callback data in req.body
            // and security token in x-callback-token header
            const callbackToken = req.headers["x-callback-token"];
            const result = await transactionOrder.handleXenditCallback(req.body, callbackToken);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async shipTransaction(req, res) {
        try {
            const merchantId = req.user.id;
            const { transactionId } = req.body;
            const result = await transactionOrder.updateTransactionToShipped(transactionId, merchantId);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async deliverTransaction(req, res) {
        try {
            const merchantId = req.user.id;
            const { transactionId } = req.body;
            const result = await transactionOrder.updateTransactionToDelivered(transactionId, merchantId);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async completeTransaction(req, res) {
        try {
            const customerId = req.user.id;
            const { transactionId } = req.body;
            const result = await transactionOrder.completeTransaction(transactionId, customerId);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message);
        } catch (error) {
            return response.serverError(res, error);
        }
    },
};
