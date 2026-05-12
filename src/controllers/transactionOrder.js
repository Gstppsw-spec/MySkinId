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
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async updatePaymentMethod(req, res) {
    const { id } = req.params;
    const data = req.body;
    const result = await transactionOrder.updatePaymentMethod(id, data, req.file);
    return res.status(result.status ? 200 : 400).json(result);
  },

  async getTransactionStatus(req, res) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;
      const result = await transactionOrder.getTransactionStatus(
        orderId,
        userId,
      );
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
      const result = await transactionOrder.handleXenditCallback(
        req.body,
        callbackToken,
      );
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async biteshipCallback(req, res) {
    try {
      const result = await transactionOrder.handleBiteshipCallback(req.body);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async shipTransaction(req, res) {
    try {
      const adminId = req.user.id;
      const { transactionId, trackingNumber } = req.body;
      const result = await transactionOrder.updateTransactionToShipped(
        transactionId,
        adminId,
        trackingNumber,
      );
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async deliverTransaction(req, res) {
    try {
      const adminId = req.user.id;
      const { transactionId } = req.body;
      const result = await transactionOrder.updateTransactionToDelivered(
        transactionId,
        adminId,
      );
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async completeTransaction(req, res) {
    try {
      const customerId = req.user.id;
      const { transactionId } = req.body;
      const result = await transactionOrder.completeTransaction(
        transactionId,
        customerId,
      );
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getMyVouchers(req, res) {
    try {
      const customerId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const status = req.query.status
        ? Array.isArray(req.query.status)
          ? req.query.status
          : req.query.status.split(",")
        : null;

      const result = await transactionOrder.getMyVouchers(customerId, {
        page,
        pageSize,
        status,
      });
      if (!result.status) return response.error(res, result.message);

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

  async claimVoucher(req, res) {
    try {
      const adminId = req.user.id;
      const { voucherCode } = req.body;
      const result = await transactionOrder.claimVoucher(voucherCode, adminId);
      if (!result.status) return response.error(res, result.message);
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
      if (!result.status) return response.error(res, result.message);
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
      const { search, status, locationId, companyId } = req.query;
      
      const filters = {
        page,
        pageSize,
        search,
        status,
        locationId: locationId ? (Array.isArray(locationId) ? locationId : [locationId]) : null,
        companyId: companyId ? (Array.isArray(companyId) ? companyId : [companyId]) : null,
      };
      
      const result = await transactionOrder.getOutletTransactions(adminId, filters);

      if (!result.status) return response.error(res, result.message);

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

  async getOutletShippedTransactions(req, res) {
    try {
      const adminId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const { search } = req.query;
      const status = ["PAID", "WAITING_PICKUP", "SHIPPED"];

      const result = await transactionOrder.getOutletTransactions(adminId, {
        page,
        pageSize,
        search,
        status,
        productOnlyForPaid: true,
      });

      if (!result.status) return response.error(res, result.message);

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

  async getShippingLabel(req, res) {
    try {
      const adminId = req.user.id;
      const { transactionId } = req.params;

      const result = await transactionOrder.getShippingLabel(transactionId, adminId);

      if (!result.status) return response.error(res, result.message);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${result.data.filename}"`);
      return res.send(result.data.pdf);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getCustomerTransactionHistory(req, res) {
    try {
      const customerId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;

      const status = req.query.status
        ? Array.isArray(req.query.status)
          ? req.query.status
          : req.query.status.split(",")
        : null;

      const result = await transactionOrder.getCustomerTransactionHistory(
        customerId,
        { page, pageSize, status },
      );

      if (!result.status) return response.error(res, result.message);

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
      const type = req.query.type || null;

      const result = await transactionOrder.getCustomerPurchasedProducts(
        customerId,
        { page, pageSize, type },
      );

      if (!result.status) return response.error(res, result.message);

      return response.success(res, result.message, {
        list: result.data,
        pagination: formatPagination(result.totalCount, page, pageSize),
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

      const result = await transactionOrder.getCustomerUnpaidOrders(
        customerId,
        { page, pageSize },
      );

      if (!result.status) return response.error(res, result.message);

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

      const result = await transactionOrder.getCustomerCompletedTransactions(
        customerId,
        { page, pageSize },
      );

      if (!result.status) return response.error(res, result.message);

      return response.success(res, result.message, {
        list: result.data,
        pagination: formatPagination(result.totalCount, page, pageSize),
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

      const status = req.query.status
        ? Array.isArray(req.query.status)
          ? req.query.status
          : req.query.status.split(",")
        : null;

      const result = await transactionOrder.getCustomerShippingTransactions(
        customerId,
        { page, pageSize, status },
      );

      if (!result.status) return response.error(res, result.message);

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
      const result = await transactionOrder.getCustomerOrderTrackingDetail(
        transactionId,
        userId,
      );
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getTransactionDetail(req, res) {
    try {
      const userId = req.user.id;
      const { transactionId } = req.params;
      const result = await transactionOrder.getTransactionDetail(
        transactionId,
        userId,
      );
      if (!result.status) return response.error(res, result.message);
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
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getOrderDetail(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const result = await transactionOrder.getOrderDetail(
        id,
        userId,
        userRole,
      );
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getCustomerOrderHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, pageSize = 10 } = req.query;
      const result = await transactionOrder.getCustomerOrderHistory(userId, {
        page,
        pageSize,
      });
      if (!result.status) return response.error(res, result.message);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        pagination: formatPagination(
          result.totalCount,
          parseInt(page),
          parseInt(pageSize),
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

      const result = await transactionOrder.exportTransactions(adminId, {
        startDate,
        endDate,
        format,
      });

      if (!result.status) {
        return response.error(res, result.message);
      }

      res.setHeader("Content-Type", result.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${result.filename}`,
      );

      return res.send(result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getFinancialReport(req, res) {
    try {
      const adminId = req.user.id;
      const { 
        startDate, 
        endDate, 
        locationId, 
        page = 1, 
        pageSize = 100 
      } = req.query;

      const result = await transactionOrder.getFinancialReport(adminId, {
        startDate,
        endDate,
        locationId: locationId ? (Array.isArray(locationId) ? locationId : [locationId]) : null,
        page,
        pageSize,
      });

      if (!result.status) return response.error(res, result.message);

      return response.success(res, result.message, {
        list: result.data,
        pagination: formatPagination(result.totalCount, page, pageSize),
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getTransferStatus(req, res) {
    try {
      const { orderId } = req.params;
      const xenditPlatformService = require("../services/xenditPlatform.service");
      const result = await xenditPlatformService.getTransfersByOrder(orderId);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async retryTransfer(req, res) {
    try {
      const { transferId } = req.params;
      const xenditPlatformService = require("../services/xenditPlatform.service");
      const result =
        await xenditPlatformService.retryFailedTransfer(transferId);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
  async getOutletStats(req, res) {
    try {
      const adminId = req.user.id;
      const { startDate, endDate } = req.query;

      const result = await transactionOrder.getOutletStats(adminId, {
        startDate,
        endDate,
      });

      if (!result.status) return response.error(res, result.message);

      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  // --- SUPER ADMIN: Settlement Management ---
  async getPendingSettlements(req, res) {
    try {
      const { status = "PENDING_SETTLEMENT", page = 1, pageSize = 50 } = req.query;
      const { Op } = require("sequelize");
      const { platformTransfer, masterLocation, transactionItem } = require("../models");

      const where = {};
      if (status === "ALL") {
        // Show all
      } else {
        where.status = status;
      }

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const { count, rows } = await platformTransfer.findAndCountAll({
        where,
        include: [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "companyId"],
          },
          {
            model: transactionItem,
            as: "transactionItem",
            attributes: ["id", "itemType", "itemName", "voucherCode", "totalPrice"],
          },
        ],
        order: [["createdAt", "ASC"]],
        limit: parseInt(pageSize),
        offset,
      });

      return response.success(res, `Found ${count} transfers`, {
        list: rows,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async manualSettle(req, res) {
    try {
      const { transferId } = req.params;
      const xenditPlatformService = require("../services/xenditPlatform.service");
      const { platformTransfer } = require("../models");

      const transfer = await platformTransfer.findByPk(transferId);
      if (!transfer) {
        return response.error(res, "Transfer not found");
      }

      if (transfer.status === "SUCCESS") {
        return response.error(res, "Transfer already settled");
      }

      // Force execute the settlement (skip status checks — admin override)
      const result = await xenditPlatformService.executePendingTransfer(transferId);

      if (result.status) {
        // Also credit voucher subsidy if applicable
        try {
          const voucherService = require("../services/voucher.service");
          const { CompanyAdsBalanceHistory } = require("../models");

          const alreadyCredited = await CompanyAdsBalanceHistory.findOne({
            where: { referenceId: transfer.orderId, type: "VOUCHER_SUBSIDY" }
          });

          if (!alreadyCredited) {
            await voucherService.creditVoucherSubsidy(transfer.orderId);
          }
        } catch (subsidyErr) {
          console.error("[ManualSettle] Subsidy credit error:", subsidyErr.message);
        }
      }

      if (!result.status) return response.error(res, result.message);
      return response.success(res, "Settlement executed successfully", result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async manualSettleAll(req, res) {
    try {
      const { Op } = require("sequelize");
      const { platformTransfer } = require("../models");
      const xenditPlatformService = require("../services/xenditPlatform.service");
      const voucherService = require("../services/voucher.service");
      const { CompanyAdsBalanceHistory } = require("../models");

      const pendingTransfers = await platformTransfer.findAll({
        where: { status: { [Op.in]: ["PENDING_SETTLEMENT", "FAILED"] } }
      });

      const results = [];
      const errors = [];

      for (const transfer of pendingTransfers) {
        try {
          const result = await xenditPlatformService.executePendingTransfer(transfer.id);
          if (result.status) {
            results.push({ id: transfer.id, reference: transfer.reference, status: "settled" });

            // Credit voucher subsidy
            try {
              const alreadyCredited = await CompanyAdsBalanceHistory.findOne({
                where: { referenceId: transfer.orderId, type: "VOUCHER_SUBSIDY" }
              });
              if (!alreadyCredited) {
                await voucherService.creditVoucherSubsidy(transfer.orderId);
              }
            } catch (e) { /* ignore */ }
          } else {
            errors.push({ id: transfer.id, reference: transfer.reference, error: result.message });
          }
        } catch (err) {
          errors.push({ id: transfer.id, reference: transfer.reference, error: err.message });
        }
      }

      return response.success(res, `Settled ${results.length}, failed ${errors.length}`, {
        settled: results,
        failed: errors,
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
