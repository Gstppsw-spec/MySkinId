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

    async buyPremiumBadge(req, res) {
        try {
            const userId = req.user.id;
            const result = await transactionOrder.buyPremiumBadge(req.body, userId);
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
            const adminId = req.user.id;
            const { transactionId, trackingNumber } = req.body;
            const result = await transactionOrder.updateTransactionToShipped(transactionId, adminId, trackingNumber);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message);
        } catch (error) {
            return response.serverError(res, error);
        }
    },


    async deliverTransaction(req, res) {
        try {
            const adminId = req.user.id;
            const { transactionId } = req.body;
            const result = await transactionOrder.updateTransactionToDelivered(transactionId, adminId);
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
            const { status } = req.query;

            const result = await transactionOrder.getOutletTransactions(adminId, { page, pageSize, search, status });

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

    async getCustomerTransactionHistory(req, res) {
        try {
            const customerId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;

            const result = await transactionOrder.getCustomerTransactionHistory(customerId, { page, pageSize });

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

    async getCustomerPurchasedProducts(req, res) {
        try {
            const customerId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;

            const result = await transactionOrder.getCustomerPurchasedProducts(customerId, { page, pageSize });

            if (!result.status)
                return response.error(res, result.message);

            return response.success(res, result.message, {
                list: result.data,
                pagination: formatPagination(
                    result.totalCount,
                    page,
                    pageSize
                )
            });
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getCustomerUnpaidOrders(req, res) {
        try {
            const customerId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;

            const result = await transactionOrder.getCustomerUnpaidOrders(customerId, { page, pageSize });

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

    async getCustomerCompletedTransactions(req, res) {
        try {
            const customerId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;

            const result = await transactionOrder.getCustomerCompletedTransactions(customerId, { page, pageSize });

            if (!result.status)
                return response.error(res, result.message);

            return response.success(res, result.message, {
                list: result.data,
                pagination: formatPagination(
                    result.totalCount,
                    page,
                    pageSize
                )
            });
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getCustomerShippingTransactions(req, res) {
        try {
            const customerId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;

            const result = await transactionOrder.getCustomerShippingTransactions(customerId, { page, pageSize });

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

    async getCustomerOrderTrackingDetail(req, res) {
        try {
            const userId = req.user.id;
            const { transactionId } = req.params;
            const result = await transactionOrder.getCustomerOrderTrackingDetail(transactionId, userId);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getTransactionDetail(req, res) {
        try {
            const userId = req.user.id;
            const { transactionId } = req.params;
            const result = await transactionOrder.getTransactionDetail(transactionId, userId);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },
    async getPaymentDetail(req, res) {
        try {
            const userId = req.user.id;
            const { orderId } = req.params;
            const result = await transactionOrder.getPaymentDetail(orderId, userId);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getOrderDetail(req, res) {
        try {
            const { id } = req.params;
            const result = await transactionOrder.getOrderDetail(id);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getCustomerOrderHistory(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, pageSize = 10 } = req.query;
            const result = await transactionOrder.getCustomerOrderHistory(userId, { page, pageSize });
            if (!result.status)
                return response.error(res, result.message);

            return res.status(200).json({
                success: true,
                message: result.message,
                data: result.data,
                pagination: formatPagination(
                    result.totalCount,
                    parseInt(page),
                    parseInt(pageSize)
                ),
            });
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async exportTransactions(req, res) {
        try {
            const adminId = req.user.id;
            const { startDate, endDate, format } = req.query;

            const result = await transactionOrder.exportTransactions(adminId, { startDate, endDate, format });

            if (!result.status) {
                return response.error(res, result.message);
            }

            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);

            return res.send(result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getTransferStatus(req, res) {
        try {
            const { orderId } = req.params;
            const xenditPlatformService = require("../services/xenditPlatform.service");
            const result = await xenditPlatformService.getTransfersByOrder(orderId);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async retryTransfer(req, res) {
        try {
            const { transferId } = req.params;
            const xenditPlatformService = require("../services/xenditPlatform.service");
            const result = await xenditPlatformService.retryFailedTransfer(transferId);
            if (!result.status)
                return response.error(res, result.message);
            return response.success(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },
};
