const { Op } = require("sequelize");
const {
  AdsConfig,
  AdsPurchase,
  masterLocation,
  masterProduct,
  masterProductImage,
  masterPackage,
  order,
  orderPayment,
  transaction,
  transactionItem,
  relationshipUserCompany,
  masterUser,
  masterRole,
  sequelize,
} = require("../models");

module.exports = {
  /**
   * Super Admin: Get all ads configurations
   */
  async getConfig(type) {
    try {
      const where = {};
      if (type) where.type = type;

      const data = await AdsConfig.findAll({
        where,
        order: [
          ["type", "ASC"],
          ["position", "ASC"],
          ["slideNumber", "ASC"],
        ],
      });
      return { status: true, message: "Success", data };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Super Admin: Update or Create ads configuration
   */
  async upsertConfig(data) {
    try {
      const { type, position, slideNumber, pricePerDay, maxSlots, isActive } = data;
      
      // Find existing config by type, position, and slideNumber
      let config = await AdsConfig.findOne({
        where: { 
          type, 
          position: position || null, 
          slideNumber: slideNumber || null 
        }
      });

      if (config) {
        await config.update({ pricePerDay, maxSlots, isActive });
      } else {
        config = await AdsConfig.create({
          type,
          position,
          slideNumber,
          pricePerDay,
          maxSlots: maxSlots || 1,
          isActive: isActive !== undefined ? isActive : true
        });
      }

      return { status: true, message: "Config updated", data: config };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Super Admin: Bulk Update or Create ads configurations
   */
  async bulkUpsertConfig(configsArray) {
    const t = await sequelize.transaction();
    try {
      const results = [];
      for (const item of configsArray) {
        const { type, position, slideNumber, pricePerDay, maxSlots, isActive } = item;
        
        let config = await AdsConfig.findOne({
          where: { 
            type, 
            position: position || null, 
            slideNumber: slideNumber || null 
          },
          transaction: t
        });

        if (config) {
          await config.update({ pricePerDay, maxSlots, isActive }, { transaction: t });
        } else {
          config = await AdsConfig.create({
            type,
            position,
            slideNumber,
            pricePerDay,
            maxSlots: maxSlots || 1,
            isActive: isActive !== undefined ? isActive : true
          }, { transaction: t });
        }
        results.push(config);
      }
      
      await t.commit();
      return { status: true, message: `${results.length} config(s) processed`, data: results };
    } catch (error) {
      await t.rollback();
      return { status: false, message: error.message };
    }
  },

  /**
   * Super Admin: Update ads configuration by ID
   */
  async updateConfig(id, data) {
    try {
      const { pricePerDay, maxSlots, isActive } = data;
      const config = await AdsConfig.findByPk(id);
      if (!config) return { status: false, message: "Ads configuration not found" };

      await config.update({ pricePerDay, maxSlots, isActive });
      return { status: true, message: "Config updated", data: config };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Super Admin: Delete ads configuration by ID
   */
  async deleteConfig(ids) {
    try {
      const { Op } = require("sequelize");
      const deletedCount = await AdsConfig.destroy({
        where: { id: { [Op.in]: ids } }
      });

      return { 
        status: true, 
        message: `${deletedCount} configuration(s) deleted successfully`,
        data: { deletedCount }
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Admin Company: Check available days for an ad type/slot
   */
  async getAvailableDays(type, position, slideNumber, month, year, adsConfigId) {
    try {
      let activeType = type;
      let activePosition = position;
      let activeSlideNumber = slideNumber;

      if (adsConfigId) {
        const config = await AdsConfig.findByPk(adsConfigId);
        if (!config) throw new Error("Ads configuration not found");
        activeType = config.type;
        activePosition = config.position;
        activeSlideNumber = config.slideNumber;
      }

      if (!activeType) throw new Error("Ads type or adsConfigId is required");

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59); // End of the last day of the month

      // 1. Ambil semua configId yang memiliki kriteria yang sama (type, position, slideNumber)
      // Ini memastikan kita memblokir semua iklan yang identik pengaturannya
      const relatedConfigs = await AdsConfig.findAll({
        where: {
          type: activeType,
          ...(activePosition !== undefined && activePosition !== null ? { position: activePosition } : {}),
          ...(activeSlideNumber !== undefined && activeSlideNumber !== null ? { slideNumber: activeSlideNumber } : {}),
        },
        attributes: ["id"],
        raw: true
      });
      const configIds = relatedConfigs.map(c => c.id);

      // 2. Cari pembelian yang tumpang tindih
      const existingPurchases = await AdsPurchase.findAll({
        where: {
          adsType: activeType,
          status: { [Op.in]: ["PAID", "PENDING"] },
          [Op.and]: [
            // Cek ketersediaan berdasarkan configId ATAU kecocokan manual jika configId null
            {
              [Op.or]: [
                { configId: { [Op.in]: configIds } },
                {
                  [Op.and]: [
                    { configId: null },
                    { adsType: activeType }
                    // Jika data posisi ada di JSON, bisa ditambahkan filter JSON di sini
                  ]
                }
              ]
            },
            // Logika rentang tanggal
            {
              [Op.or]: [
                { startDate: { [Op.between]: [startDate, endDate] } },
                { endDate: { [Op.between]: [startDate, endDate] } },
                {
                  [Op.and]: [
                    { startDate: { [Op.lte]: startDate } },
                    { endDate: { [Op.gte]: endDate } }
                  ]
                }
              ]
            }
          ]
        },
        order: [["startDate", "ASC"]]
      });

      return { status: true, message: "Available days fetched", data: existingPurchases };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Customer: Get all active ads with fallback to default values
   */
  async getActiveAds() {
    try {
      const now = new Date();
      const activePurchases = await AdsPurchase.findAll({
        where: {
          status: "PAID",
          isActive: true,
          startDate: { [Op.lte]: now },
          endDate: { [Op.gte]: now },
        },
        include: [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "address", "ratingAvg", "isPremium"],
          },
        ],
      });

      const responseData = {
        banners: null,
        carousels: null,
        popup: null,
        topDeals: null,
        premiumOutlets: [],
        premiumSearch: [],
        premiumHome: [],
      };

      // Process Purchases
      activePurchases.forEach((p) => {
        const item = {
          id: p.id,
          locationId: p.locationId,
          locationName: p.location ? p.location.name : null,
          data: p.data,
          isAd: true,
          isPremium: p.location ? !!p.location.isPremium : false,
          referenceType: p.referenceType,
          referenceId: p.referenceId,
        };

        if (p.adsType === "BANNER") {
          if (!responseData.banners) responseData.banners = [];
          responseData.banners.push(item);
        } else if (p.adsType === "CAROUSEL") {
          if (!responseData.carousels) responseData.carousels = [];
          responseData.carousels.push(item);
        } else if (p.adsType === "POPUP") {
          responseData.popup = item;
        } else if (p.adsType === "TOPDEALS") {
          if (!responseData.topDeals) {
            responseData.topDeals = { product: [], service: [], package: [] };
          }
          const group = p.referenceType
            ? p.referenceType.toLowerCase()
            : "product";
          if (responseData.topDeals[group]) {
            responseData.topDeals[group].push(item);
          }
        } else if (
          p.adsType === "PREMIUM_SEARCH" ||
          p.adsType === "PREMIUM_BADGE"
        )
          responseData.premiumSearch.push(item);
        else if (p.adsType === "PREMIUM_HOME")
          responseData.premiumHome.push(item);
      });

      // Legacy support / merged list for convenience
      responseData.premiumOutlets = [
        ...responseData.premiumSearch,
        ...responseData.premiumHome,
      ];

      // --- Fallback Logic ---

      // 1. Top Deals Fallback (Max 5) - REMOVED per FE request
      // We only show what is purchased. If nothing is purchased, topDeals stays null.

      // 2. Premium Outlets Fallback (Max 5)
      // Only show fallback if NO PAID ADS exist for this category
      if (responseData.premiumOutlets.length === 0) {
        const latestOutlets = await masterLocation.findAll({
          where: {
            isactive: true,
            isVerified: true,
          },
          order: [
            ["isPremium", "DESC"], // Prioritize isPremium: true (Premium subscription)
            ["createdAt", "DESC"],
          ],
          limit: 5,
          attributes: ["id", "name", "address", "ratingAvg", "isPremium"],
        });

        latestOutlets.forEach((loc) => {
          responseData.premiumOutlets.push({
            id: loc.id,
            locationId: loc.id,
            locationName: loc.name,
            address: loc.address,
            rating: loc.ratingAvg,
            isAd: false,
            isPremium: !!loc.isPremium,
          });
        });
      }

      return { status: true, message: "Active ads fetched", data: responseData };
    } catch (error) {
      console.error("getActiveAds Error:", error);
      return { status: false, message: error.message };
    }
  },

  /**
   * Admin Company: List ads for their outlet
   */
  async getOutletAds(adminId, type) {
    try {
      const transactionOrder = require("./transactionOrder");
      const locationIds = await transactionOrder._getAdminLocationIds(adminId);
      
      const where = { locationId: { [Op.in]: locationIds } };
      if (type) {
        where.adsType = type;
      }

      const data = await AdsPurchase.findAll({
        where,
        include: [{ model: AdsConfig, as: "config" }],
        order: [["createdAt", "DESC"]]
      });

      return { status: true, message: "Outlet ads fetched", data };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Admin Company: List ads waiting for payment
   */
  async getWaitingPaymentAds(adminId, { page = 1, pageSize = 10 }) {
    try {
      const transactionOrder = require("./transactionOrder");
      const locationIds = await transactionOrder._getAdminLocationIds(adminId);

      // Get Company IDs associated with the admin
      const adminCompanies = await relationshipUserCompany.findAll({
        where: { userId: adminId, isactive: true },
        attributes: ["companyId"],
        raw: true
      });
      const companyIds = adminCompanies.map(c => c.companyId);

      const limit = pageSize;
      const offset = (page - 1) * pageSize;

      const { count, rows: transactions } = await transaction.findAndCountAll({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { locationId: { [Op.in]: locationIds } },
                {
                  [Op.and]: [
                    { "$items.itemType$": "AD_BALANCE_TOPUP" },
                    { "$items.itemId$": { [Op.in]: companyIds } }
                  ]
                }
              ]
            },
            { "$order.paymentStatus$": "UNPAID" }
          ]
        },
        include: [
          {
            model: order,
            as: "order",
            include: [
              {
                model: orderPayment,
                as: "payments",
                required: false
              },
              {
                model: AdsPurchase,
                as: "adsPurchase",
                include: [{ model: AdsConfig, as: "config" }],
                required: false
              }
            ]
          },
          {
            model: transactionItem,
            as: "items",
            required: false // Needed for AD_BALANCE_TOPUP filter
          }
        ],
        subQuery: false, // Prevents "Unknown column" errors when using limit/offset with joined where
        distinct: true, 
        limit,
        offset,
        order: [["createdAt", "DESC"]]
      });

      const mappedData = transactions.map((t) => {
        const orderData = t.order || {};
        const payments = orderData.payments || [];
        const latestPayment = payments.length > 0 ? payments[0] : null;
        const purchase = orderData.adsPurchase || null;
        
        // Identify type
        let type = "PLACEMENT";
        if (t.items && t.items.some(it => it.itemType === "AD_BALANCE_TOPUP")) {
          type = "TOPUP";
        }

        return {
          trxId: t.id,
          transactionNumber: t.transactionNumber,
          type: type,
          amount: t.grandTotal,
          status: orderData.paymentStatus,
          createdAt: t.createdAt,
          order: {
            id: orderData.id,
            orderNumber: orderData.orderNumber
          },
          payment: latestPayment ? {
            paymentMethod: latestPayment.paymentMethod,
            checkoutUrl: latestPayment.checkoutUrl,
            instructions: latestPayment.instructions ? latestPayment.instructions.split("\n") : []
          } : null,
          details: purchase ? {
            adsType: purchase.adsType,
            config: purchase.config,
            startDate: purchase.startDate,
            endDate: purchase.endDate,
            data: purchase.data
          } : (type === "TOPUP" ? { name: "Balance Top-up" } : null)
        };
      });

      return { 
        status: true, 
        message: "Waiting payment ads fetched", 
        data: {
          totalCount: count,
          totalPages: Math.ceil(count / pageSize),
          currentPage: page,
          pageSize: pageSize,
          rows: mappedData
        } 
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Internal/Payment: Activate ad after payment
   */
  async activatePurchase(orderId) {
    try {
      const purchase = await AdsPurchase.findOne({ where: { orderId } });
      if (!purchase) return { status: false, message: "Purchase record not found" };

      await purchase.update({ 
        status: "PAID", 
        isActive: true 
      });

      // Special case for PREMIUM updates on location
      if (purchase.adsType === "PREMIUM_SEARCH" || purchase.adsType === "PREMIUM_BADGE") {
        await masterLocation.update(
          { 
            isPremium: true, 
            premiumExpiredAt: purchase.endDate 
          },
          { where: { id: purchase.locationId } }
        );
      }

      return { status: true, message: "Ad activated" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }
};
