const { AdsDesignRequest, masterLocation, masterCompany, order, orderPayment, sequelize, Sequelize } = require("../models");
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

  async updateRequest(id, data) {
    try {
      const { title, adsType, description, referenceImages } = data;

      const request = await AdsDesignRequest.findByPk(id);
      if (!request) return { status: false, message: "Request not found" };

      if (request.status !== "REQUESTED") {
        return { status: false, message: "Cannot edit request once it has been processed" };
      }

      const updateData = { title, adsType, description };
      if (referenceImages && referenceImages.length > 0) {
        updateData.referenceImages = referenceImages;
      }

      await request.update(updateData);

      return { status: true, message: "Design request updated successfully", data: request };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async deleteRequest(id) {
    try {
      const request = await AdsDesignRequest.findByPk(id);
      if (!request) return { status: false, message: "Request not found" };

      if (request.status !== "REQUESTED") {
        return { status: false, message: "Cannot delete request once it has been processed" };
      }

      await request.update({ isActive: false });

      return { status: true, message: "Design request deleted successfully" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getMyRequests(userId, { locationId, page = 1, pageSize = 10, search = "" }) {
    try {
      const { limit, offset } = getPagination(page, pageSize);
      
      // Get all location IDs this user has access to
      const allowedLocationIds = await transactionOrder._getAdminLocationIds(userId);
      
      let finalLocationIds = allowedLocationIds;

      // If user specifically filtered by locationId(s)
      if (locationId) {
        const requestedIds = Array.isArray(locationId) ? locationId : [locationId];
        
        // Filter requested IDs to only those that are allowed
        finalLocationIds = requestedIds.filter(id => allowedLocationIds.includes(id));
        
        if (finalLocationIds.length === 0 && requestedIds.length > 0) {
          return { status: false, message: "You don't have access to the requested location(s)" };
        }
      }

      if (finalLocationIds.length === 0) {
        return {
          status: true,
          message: "No locations found for user",
          data: getPagingData({ count: 0, rows: [] }, page, pageSize),
        };
      }

      const where = { 
        locationId: { [Sequelize.Op.in]: finalLocationIds }, 
        isActive: true 
      };

      if (search) {
        where.title = { [Sequelize.Op.like]: `%${search}%` };
      }

      const result = await AdsDesignRequest.findAndCountAll({
        where,
        include: [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name"],
          },
        ],
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
  async getAllRequests({ page = 1, pageSize = 10, search = "", status = "", locationId }) {
    try {
      const { limit, offset } = getPagination(page, pageSize);
      const where = { isActive: true };

      if (search) {
        where.title = { [Sequelize.Op.like]: `%${search}%` };
      }
      if (status) {
        where.status = status;
      }
      if (locationId) {
        const locationIds = Array.isArray(locationId) ? locationId : [locationId];
        where.locationId = { [Sequelize.Op.in]: locationIds };
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
        
        await orderPayment.create({
          orderId: newOrder.id,
          paymentMethod: "FREE",
          amount: 0,
          paymentStatus: "COMPLETED",
          referenceNumber: request.id,
        }, { transaction: t });
      } else if (paymentMethodCode === "SALDO_ADS") {
        // Deduct from Company Ads Balance
        const companyId = request.location?.companyId;
        if (!companyId) throw new Error("Location does not have a company associated");

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

        // Record the payment method in orderPayment
        await orderPayment.create({
          orderId: newOrder.id,
          paymentMethod: "SALDO_ADS",
          amount: amount,
          paymentStatus: "COMPLETED",
          referenceNumber: request.id,
        }, { transaction: t });
      } else {
        // Xendit payment
        const xenditPayment = await transactionOrder._createXenditPayment(
          newOrder.orderNumber,
          amount,
          null, 
          paymentMethodCode
        );
        paymentInstructions = xenditPayment;

        // Record the pending payment in orderPayment
        await orderPayment.create({
          orderId: newOrder.id,
          paymentMethod: paymentMethodCode,
          amount: amount,
          paymentStatus: "PENDING",
          referenceNumber: xenditPayment.id,
          checkoutUrl: xenditPayment.checkoutUrl || xenditPayment.invoiceUrl,
        }, { transaction: t });
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
