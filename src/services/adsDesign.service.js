const { AdsDesignRequest, masterLocation, masterCompany, order, sequelize } = require("../models");
const transactionOrder = require("./transactionOrder");
const balanceService = require("./balance.service");
const { getPagination, getPagingData } = require("../utils/pagination");
const { nanoid } = require("nanoid");

module.exports = {
  async createRequest(locationId, data) {
    try {
      const { title, adsType, description, referenceImages } = data;

      const newRequest = await AdsDesignRequest.create({
        locationId,
        title,
        adsType,
        description,
        referenceImages, // already array, handled by model setter
        status: "REQUESTED",
      });

      return { status: true, message: "Design request created successfully", data: newRequest };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getMyRequests(locationId, { page = 1, pageSize = 10, search = "" }) {
    try {
      const { limit, offset } = getPagination(page, pageSize);
      const where = { locationId, isActive: true };

      if (search) {
        where.title = { [sequelize.Op.like]: `%${search}%` };
      }

      const result = await AdsDesignRequest.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      const response = getPagingData(result, page, pageSize);

      return {
        status: true,
        message: "Success fetching requests",
        data: response,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getRequestById(id) {
    try {
      const request = await AdsDesignRequest.findOne({
        where: { id, isActive: true },
        include: [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "companyId"],
          },
        ],
      });

      if (!request) {
        return { status: false, message: "Design request not found" };
      }

      return { status: true, message: "Success", data: request };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  // For Admin
  async getAllRequests({ page = 1, pageSize = 10, search = "", status = "" }) {
    try {
      const { limit, offset } = getPagination(page, pageSize);
      const where = { isActive: true };

      if (search) {
        where.title = { [sequelize.Op.like]: `%${search}%` };
      }
      if (status) {
        where.status = status;
      }

      const result = await AdsDesignRequest.findAndCountAll({
        where,
        include: [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "companyId"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      const response = getPagingData(result, page, pageSize);

      return {
        status: true,
        message: "Success fetching all requests",
        data: response,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async processRequest(id) {
    try {
      const request = await AdsDesignRequest.findByPk(id);
      if (!request) return { status: false, message: "Request not found" };

      if (request.status !== "REQUESTED" && request.status !== "REVISION_REQUESTED") {
        return { status: false, message: "Cannot process request in current status" };
      }

      await request.update({ status: "PROCESSING" });
      return { status: true, message: "Request is now being processed", data: request };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async submitDesignResult(id, resultImages, price) {
    try {
      const request = await AdsDesignRequest.findByPk(id);
      if (!request) return { status: false, message: "Request not found" };

      if (request.status !== "PROCESSING") {
        return { status: false, message: "Request must be in PROCESSING status to submit result" };
      }

      await request.update({
        resultImages,
        price: parseFloat(price) || 0,
        status: "WAITING_APPROVAL",
      });

      return { status: true, message: "Design result submitted", data: request };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async requestRevision(id, revisionNote) {
    try {
      const request = await AdsDesignRequest.findByPk(id);
      if (!request) return { status: false, message: "Request not found" };

      if (request.status !== "WAITING_APPROVAL") {
        return { status: false, message: "Can only request revision when waiting for approval" };
      }

      if (request.revisionCount >= 3) {
        return { status: false, message: "Maximum revision limit (3) reached" };
      }

      await request.update({
        revisionNote,
        revisionCount: request.revisionCount + 1,
        status: "REVISION_REQUESTED",
      });

      return { status: true, message: "Revision requested successfully", data: request };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async approveDesign(id, userId, paymentMethodCode) {
    const t = await sequelize.transaction();
    try {
      const request = await AdsDesignRequest.findOne({
        where: { id },
        include: [{ model: masterLocation, as: "location" }],
        transaction: t,
        lock: true,
      });

      if (!request) throw new Error("Request not found");
      if (request.status !== "WAITING_APPROVAL") {
        throw new Error("Can only approve design when in WAITING_APPROVAL status");
      }

      if (!paymentMethodCode) {
        throw new Error("Payment method code is required");
      }

      const amount = parseFloat(request.price) || 0;
      
      // Create order first
      const newOrder = await order.create({
        orderNumber: `DES-${nanoid(10).toUpperCase()}`,
        customerId: userId, // User acting as customer
        totalAmount: amount,
        paymentStatus: "UNPAID",
      }, { transaction: t });

      await request.update({
        orderId: newOrder.id,
        status: "PENDING_PAYMENT",
      }, { transaction: t });

      // Handle payment
      let paymentInstructions = null;
      if (amount <= 0) {
        // Free design
        await newOrder.update({ paymentStatus: "PAID" }, { transaction: t });
        await request.update({ status: "COMPLETED" }, { transaction: t });
      } else if (paymentMethodCode === "SALDO_ADS") {
        // Deduct from Company Ads Balance
        const companyId = request.location?.companyId;
        if (!companyId) throw new Error("Location does not have a company associated");

        // Pass the transaction to spendBalance to ensure atomicity
        const balanceResult = await balanceService.spendBalance(
          companyId,
          amount,
          request.id,
          `Payment for Ads Design Asset: ${request.title}`,
          t
        );

        if (!balanceResult.status) {
          throw new Error(balanceResult.message);
        }

        await newOrder.update({ paymentStatus: "PAID" }, { transaction: t });
        await request.update({ status: "COMPLETED" }, { transaction: t });
      } else {
        // Xendit payment
        const xenditPayment = await transactionOrder._createXenditPayment(
          newOrder.orderNumber,
          amount,
          null, // customer info missing or construct mock
          paymentMethodCode
        );
        paymentInstructions = xenditPayment;
      }

      await t.commit();
      return { 
        status: true, 
        message: amount <= 0 || paymentMethodCode === "SALDO_ADS" ? "Design approved and paid successfully" : "Design approved, awaiting payment", 
        data: {
          request,
          order: newOrder,
          payment: paymentInstructions
        }
      };
    } catch (error) {
      if (t) await t.rollback();
      return { status: false, message: error.message };
    }
  },
};
