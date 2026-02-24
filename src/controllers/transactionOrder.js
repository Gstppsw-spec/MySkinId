const transactionOrder = require("../services/transactionOrder");
const response = require("../helpers/response");
const { formatPagination } = require("../utils/pagination");

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

    async getPaymentMethods(req, res) {
        try {
            const result = await transactionOrder.getAvailablePaymentMethods();
            if (!result.status)
                return response.error(res, result.message);
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

    async getMyVouchers(req, res) {
        try {
            const customerId = req.user.id;
            const result = await transactionOrder.getMyVouchers(customerId);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async claimVoucher(req, res) {
        try {
            const adminId = req.user.id;
            const { voucherCode } = req.body;
            const result = await transactionOrder.claimVoucher(voucherCode, adminId);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async checkVoucher(req, res) {
        try {
            const adminId = req.user.id;
            const { voucherCode } = req.params;
            const result = await transactionOrder.checkVoucher(voucherCode, adminId);
            if (!result.status)
                return response.error(res, result.message, result.data);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async addPaymentMethod(req, res) {
        try {
            const result = await transactionOrder.addPaymentMethod(req.body);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getOutletTransactions(req, res) {
        try {
            const adminId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const { search } = req.query;

            const result = await transactionOrder.getOutletTransactions(adminId, { page, pageSize, search });

            if (!result.status)
                return response.error(res, result.message);

            return res.status(200).json({
                success: true,
                message: result.message,
                data: result.data,
                pagination: formatPagination(result.totalCount, page, pageSize),
            });
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getCustomerTransactions(req, res) {
        try {
            const customerId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;

            const result = await transactionOrder.getCustomerTransactions(customerId, { page, pageSize });

            if (!result.status)
                return response.error(res, result.message);

            return res.status(200).json({
                success: true,
                message: result.message,
                data: result.data,
                pagination: formatPagination(result.totalCount, page, pageSize),
            });
        } catch (error) {
            return response.serverError(res, error);
        }
    },
};
