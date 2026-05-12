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

  /**
   * Super Admin: Backfill mitra balance for old transactions.
   * Finds all PAID/DELIVERED/COMPLETED transactions with product/service/package items
   * that have NO platformTransfer record, and directly adds the balance to mitra.
   * 
   * GET ?dryRun=true  → Preview only (shows what would be processed)
   * POST              → Actually execute the backfill
   */
  async backfillOldTransactions(req, res) {
    try {
      const { Op } = require("sequelize");
      const {
        order: Order,
        transaction: Transaction,
        transactionItem: TransactionItem,
        platformTransfer,
        masterLocation,
      } = require("../models");
      const balanceService = require("../services/balance.service");
      const voucherService = require("../services/voucher.service");
      const { CompanyAdsBalanceHistory } = require("../models");

      const dryRun = req.method === "GET" || req.query.dryRun === "true";

      // Find all orders that are PAID
      const paidOrders = await Order.findAll({
        where: { paymentStatus: "PAID" },
        include: [
          {
            model: Transaction,
            as: "transactions",
            where: {
              orderStatus: { [Op.in]: ["PAID", "DELIVERED", "COMPLETED"] },
            },
            include: [
              {
                model: TransactionItem,
                as: "items",
                where: {
                  itemType: { [Op.in]: ["product", "service", "package"] },
                },
                required: true,
              },
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name", "companyId"],
              },
            ],
          },
        ],
      });

      const toProcess = [];

      for (const ord of paidOrders) {
        for (const trx of ord.transactions) {
          for (const item of trx.items) {
            // Check if a platformTransfer already exists for this item
            const existingTransfer = await platformTransfer.findOne({
              where: {
                transactionId: trx.id,
                transactionItemId: item.id,
              },
            });

            if (!existingTransfer && trx.location && trx.location.companyId) {
              // Calculate platform fee
              const amount = parseFloat(item.totalPrice);
              const company = await require("../models").masterCompany.findByPk(trx.location.companyId);
              const cutoffDate = new Date("2026-05-01T00:00:00Z");
              let feePercent = parseFloat(process.env.XENDIT_PLATFORM_FEE_PERCENT || "1");
              if (company && company.createdAt >= cutoffDate) feePercent = 4;
              const platformFee = Math.round(amount * (feePercent / 100));
              const netAmount = amount - platformFee;

              toProcess.push({
                orderId: ord.id,
                orderNumber: ord.orderNumber,
                transactionId: trx.id,
                transactionItemId: item.id,
                itemType: item.itemType,
                itemName: item.itemName,
                locationName: trx.location.name,
                companyId: trx.location.companyId,
                grossAmount: amount,
                platformFee,
                netAmount,
                orderStatus: trx.orderStatus,
              });
            }
          }
        }
      }

      if (dryRun) {
        return response.success(res, `Found ${toProcess.length} items to backfill (DRY RUN — no changes made)`, {
          items: toProcess,
          totalNetAmount: toProcess.reduce((s, i) => s + i.netAmount, 0),
        });
      }

      // Execute backfill
      const results = [];
      const errors = [];
      const processedOrders = new Set();

      for (const item of toProcess) {
        try {
          await balanceService.addBalance(
            item.companyId,
            item.netAmount,
            item.itemType === "product" ? "PRODUCT_SETTLEMENT" : "VOUCHER_SETTLEMENT",
            item.orderId,
            `Backfill settlement: ${item.itemName} (${item.orderNumber})`
          );
          results.push({ ...item, status: "settled" });

          // Credit voucher subsidy once per order
          if (!processedOrders.has(item.orderId)) {
            processedOrders.add(item.orderId);
            try {
              const alreadyCredited = await CompanyAdsBalanceHistory.findOne({
                where: { referenceId: item.orderId, type: "VOUCHER_SUBSIDY" }
              });
              if (!alreadyCredited) {
                await voucherService.creditVoucherSubsidy(item.orderId);
              }
            } catch (e) { /* ignore */ }
          }
        } catch (err) {
          errors.push({ ...item, error: err.message });
        }
      }

      return response.success(res, `Backfill complete: ${results.length} settled, ${errors.length} failed`, {
        settled: results,
        failed: errors,
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /**
   * Super Admin: View all transactions matching Logic 1 and Logic 2.
   * Ignores the gap check (Logic 3) to see what data exists.
   */
  async getRawTransactionsForSettlement(req, res) {
    try {
      const {
        order: Order,
        transaction: Transaction,
        transactionItem: TransactionItem,
        masterLocation,
      } = require("../models");

      // Find ALL orders that are PAID regardless of transaction orderStatus
      const paidOrders = await Order.findAll({
        where: { paymentStatus: "PAID" },
        include: [
          {
            model: Transaction,
            as: "transactions",
            // No orderStatus filter — show everything so we can audit
            include: [
              {
                model: TransactionItem,
                as: "items",
                // No itemType filter here either — show all items
                required: true,
              },
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name", "companyId"],
              },
            ],
          },
        ],
      });

      const list = [];
      for (const ord of paidOrders) {
        for (const trx of ord.transactions) {
          for (const item of trx.items) {
            list.push({
              orderId: ord.id,
              orderNumber: ord.orderNumber,
              transactionId: trx.id,
              transactionItemId: item.id,
              itemType: item.itemType,
              itemName: item.itemName,
              voucherCode: item.voucherCode || null,
              locationName: trx.location?.name || null,
              locationId: trx.locationId || null,
              companyId: trx.location?.companyId || null,
              grossAmount: parseFloat(item.totalPrice),
              orderStatus: trx.orderStatus,
              paymentStatus: ord.paymentStatus,
              createdAt: item.createdAt,
            });
          }
        }
      }

      return response.success(res, `Found ${list.length} total items from all PAID orders`, {
        total: list.length,
        items: list,
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
