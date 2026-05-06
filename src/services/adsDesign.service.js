const { 
  AdsDesignRequest, 
  AdsConfig,
  masterLocation, 
  masterCompany, 
  order, 
  orderPayment, 
  transaction,
  transactionItem,
  masterUser,
  masterRole,
  relationshipUserCompany,
  relationshipUserLocation,
  sequelize, 
  Sequelize 
} = require("../models");
const transactionOrder = require("./transactionOrder");
const balanceService = require("./balance.service");
const { getPagination, getPagingData } = require("../utils/pagination");
const { nanoid } = require("nanoid");

/**
 * Helper to get all company IDs an admin has access to.
 */
async function _getAdminCompanyIds(adminId) {
  const user = await masterUser.findByPk(adminId, {
    include: [{ model: masterRole, as: "role" }],
  });

  if (!user) return [];

  const roleCode = user.role?.roleCode;

  // Super Admin -> ALL companies
  if (roleCode === "SUPER_ADMIN" || roleCode === "OPERATIONAL_ADMIN") {
    const allCompanies = await masterCompany.findAll({
      attributes: ["id"],
      raw: true,
    });
    return allCompanies.map((c) => c.id);
  }

  const companyIdSet = new Set();

  // 1. Direct company assignment
  const userCompanies = await relationshipUserCompany.findAll({
    where: { userId: adminId, isactive: true },
    attributes: ["companyId"],
    raw: true,
  });
  userCompanies.forEach((uc) => companyIdSet.add(uc.companyId));

  // 2. Company from assigned locations
  const userLocations = await relationshipUserLocation.findAll({
    where: { userId: adminId, isactive: true },
    include: [{
      model: masterLocation,
      as: "location",
      attributes: ["companyId"]
    }],
  });
  userLocations.forEach((ul) => {
    if (ul.location && ul.location.companyId) {
      companyIdSet.add(ul.location.companyId);
    }
  });

  return Array.from(companyIdSet);
}

module.exports = {
  // --- Price Management ---
  async getDesignPrice() {
    try {
      const config = await AdsConfig.findOne({ where: { type: "DESIGN_SERVICE" } });
      return { 
        status: true, 
        message: "Success", 
        data: { 
          price: config ? parseFloat(config.pricePerDay) : 0 
        } 
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async setDesignPrice(price) {
    try {
      let config = await AdsConfig.findOne({ where: { type: "DESIGN_SERVICE" } });
      if (config) {
        await config.update({ pricePerDay: price });
      } else {
        config = await AdsConfig.create({
          type: "DESIGN_SERVICE",
          pricePerDay: price,
          isActive: true
        });
      }
      return { status: true, message: "Design price updated successfully", data: config };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async payDesignRequest(id, userId, paymentMethodCode) {
    const t = await sequelize.transaction();
    try {
      const request = await AdsDesignRequest.findOne({
        where: { id, isActive: true },
        include: [{ model: masterLocation, as: "location" }],
        transaction: t,
        lock: true,
      });

      if (!request) throw new Error("Request not found");
      if (request.status !== "REQUESTED") {
        throw new Error("Can only pay for requests in REQUESTED status");
      }

      if (!paymentMethodCode) throw new Error("Payment method code is required");

      const priceResult = await this.getDesignPrice();
      const amount = priceResult.data.price;

      // Create order
      const newOrder = await order.create({
        orderNumber: `DES-${nanoid(10).toUpperCase()}`,
        customerId: userId,
        totalAmount: amount,
        paymentStatus: "UNPAID",
      }, { transaction: t });

      await request.update({
        orderId: newOrder.id,
        status: "PENDING_PAYMENT",
        price: amount, // Save the price at the moment of payment
      }, { transaction: t });

      // Create transaction and transactionItem
      const newTransaction = await transaction.create({
        orderId: newOrder.id,
        transactionNumber: `TRX-DES-${nanoid(10).toUpperCase()}`,
        locationId: request.locationId,
        subTotal: amount,
        shippingFee: 0,
        grandTotal: amount,
        orderStatus: "CREATED",
      }, { transaction: t });

      await transactionItem.create({
        transactionId: newTransaction.id,
        itemType: "ADS_DESIGN",
        itemId: request.id,
        itemName: `Ads Design Service: ${request.title}`,
        quantity: 1,
        unitPrice: amount,
        totalPrice: amount,
        isShippingRequired: false,
        locationId: request.locationId,
      }, { transaction: t });

      // Handle payment
      let paymentInstructions = null;
      if (amount <= 0) {
        await newOrder.update({ paymentStatus: "PAID" }, { transaction: t });
        await request.update({ status: "PAID" }, { transaction: t });
        
        await orderPayment.create({
          orderId: newOrder.id,
          paymentMethod: "FREE",
          amount: 0,
          paymentStatus: "COMPLETED",
          referenceNumber: request.id,
        }, { transaction: t });
      } else if (paymentMethodCode === "SALDO_ADS") {
        const companyId = request.location?.companyId;
        if (!companyId) throw new Error("Location does not have a company associated");

        const balanceResult = await balanceService.spendBalance(
          companyId,
          amount,
          request.id,
          `Payment for Ads Design Asset: ${request.title}`,
          t
        );

        if (!balanceResult.status) throw new Error(balanceResult.message);

        await newOrder.update({ paymentStatus: "PAID" }, { transaction: t });
        await request.update({ status: "PAID" }, { transaction: t });

        await orderPayment.create({
          orderId: newOrder.id,
          paymentMethod: "SALDO_ADS",
          amount: amount,
          paymentStatus: "COMPLETED",
          referenceNumber: request.id,
        }, { transaction: t });
      } else {
        const xenditPayment = await transactionOrder._createXenditPayment(
          newOrder.orderNumber,
          amount,
          null, 
          paymentMethodCode
        );
        paymentInstructions = xenditPayment;

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
        message: "Payment initiated", 
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

  async createRequest(locationId, data) {
    try {
      const { title, adsType, description, referenceImages } = data;

      // Get companyId from location
      const location = await masterLocation.findByPk(locationId);
      if (!location) return { status: false, message: "Location not found" };

      const newRequest = await AdsDesignRequest.create({
        locationId,
        companyId: location.companyId,
        title,
        adsType,
        description,
        referenceImages,
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

  async getMyRequests(userId, { locationId, companyIds, page = 1, pageSize = 10, search = "", adsType, status }) {
    try {
      const { limit, offset } = getPagination(page, pageSize);
      
      // Get all company IDs this user has access to
      const allowedCompanyIds = await _getAdminCompanyIds(userId);
      
      const where = { 
        companyId: { [Sequelize.Op.in]: allowedCompanyIds }, 
        isActive: true 
      };

      // If user specifically filters by locationId(s), we still respect that but within their company
      if (locationId) {
        const ids = Array.isArray(locationId) ? locationId : (typeof locationId === "string" ? locationId.split(",") : [locationId]);
        where.locationId = { [Sequelize.Op.in]: ids.map(id => id.trim()) };
      }

      if (search) {
        where.title = { [Sequelize.Op.like]: `%${search}%` };
      }
      if (adsType) {
        where.adsType = adsType;
      }
      if (companyIds) {
        const ids = Array.isArray(companyIds) ? companyIds : (typeof companyIds === "string" ? companyIds.split(",") : [companyIds]);
        where.companyId = { [Sequelize.Op.in]: ids.map(id => id.trim()) };
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
            attributes: ["id", "name"],
          },
          {
            model: order,
            as: "order",
            attributes: ["id", "paymentStatus", "totalAmount"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      const processedRows = result.rows.map(r => {
        const plain = r.get({ plain: true });
        plain.isPaid = plain.order?.paymentStatus === "PAID";
        return plain;
      });

      return {
        status: true,
        message: "Success fetching requests",
        data: {
          ...getPagingData(result, page, pageSize),
          rows: processedRows
        },
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
          {
            model: order,
            as: "order",
            attributes: ["id", "paymentStatus", "totalAmount"],
          },
        ],
      });

      if (!request) {
        return { status: false, message: "Design request not found" };
      }

      const plainData = request.get({ plain: true });
      plainData.isPaid = plainData.order?.paymentStatus === "PAID";

      return { status: true, message: "Success", data: plainData };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  // For Admin
  async getAllRequests({ page = 1, pageSize = 10, search = "", status = "", locationId, companyIds, adsType }) {
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
        const ids = Array.isArray(locationId) ? locationId : (typeof locationId === "string" ? locationId.split(",") : [locationId]);
        where.locationId = { [Sequelize.Op.in]: ids.map(id => id.trim()) };
      }
      if (adsType) {
        where.adsType = adsType;
      }
      if (companyIds) {
        const ids = Array.isArray(companyIds) ? companyIds : (typeof companyIds === "string" ? companyIds.split(",") : [companyIds]);
        where.companyId = { [Sequelize.Op.in]: ids.map(id => id.trim()) };
      }

      const result = await AdsDesignRequest.findAndCountAll({
        where,
        include: [
          {
            model: masterCompany,
            as: "company",
            attributes: ["id", "name"],
          },
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "companyId"],
          },
          {
            model: order,
            as: "order",
            attributes: ["id", "paymentStatus", "totalAmount"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      const processedRows = result.rows.map(r => {
        const plain = r.get({ plain: true });
        plain.isPaid = plain.order?.paymentStatus === "PAID";
        return plain;
      });

      return {
        status: true,
        message: "Success fetching all requests",
        data: {
          ...getPagingData(result, page, pageSize),
          rows: processedRows
        },
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async processRequest(id) {
    try {
      const request = await AdsDesignRequest.findByPk(id);
      if (!request) return { status: false, message: "Request not found" };

      if (request.status !== "PAID" && request.status !== "REVISION_REQUESTED") {
        return { status: false, message: "Cannot process request. Payment must be confirmed (PAID status) or in REVISION_REQUESTED." };
      }

      await request.update({ status: "PROCESSING" });
      return { status: true, message: "Request is now being processed", data: request };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async submitDesignResult(id, resultImages) {
    try {
      const request = await AdsDesignRequest.findByPk(id);
      if (!request) return { status: false, message: "Request not found" };

      if (request.status !== "PROCESSING") {
        return { status: false, message: "Request must be in PROCESSING status to submit result" };
      }

      const updateData = {
        resultImages,
        status: "WAITING_APPROVAL",
      };

      await request.update(updateData);

      return { status: true, message: "Design result submitted", data: request };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async requestRevision(id, revisionNote) {
    try {
      const request = await AdsDesignRequest.findByPk(id);
      if (!request) return { status: false, message: "Request not found" };

      const allowedStatuses = ["WAITING_APPROVAL", "PENDING_PAYMENT", "COMPLETED"];
      if (!allowedStatuses.includes(request.status)) {
        return { status: false, message: "Can only request revision when waiting for approval or after payment" };
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

  async approveDesign(id) {
    try {
      const request = await AdsDesignRequest.findByPk(id, {
        include: [{ model: order, as: "order" }]
      });

      if (!request) return { status: false, message: "Request not found" };
      if (request.status !== "WAITING_APPROVAL") {
        return { status: false, message: "Can only approve design when in WAITING_APPROVAL status" };
      }

      // Since payment is now upfront, we just move to COMPLETED
      await request.update({ status: "COMPLETED" });

      return { 
        status: true, 
        message: "Design approved successfully", 
        data: request 
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
};
