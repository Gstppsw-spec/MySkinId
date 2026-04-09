const { Op } = require("sequelize");
const {
  AdsConfig,
  AdsPurchase,
  masterLocation,
  masterProduct,
  masterProductImage,
  masterPackage,
  sequelize,
} = require("../models");

module.exports = {
  /**
   * Super Admin: Get all ads configurations
   */
  async getConfig() {
    try {
      const data = await AdsConfig.findAll({
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
      const endDate = new Date(year, month, 0); // Last day of month

      const existingPurchases = await AdsPurchase.findAll({
        where: {
          adsType: activeType,
          status: "PAID",
          isActive: true,
          [Op.and]: [
            sequelize.literal(`
              configId IN (SELECT id FROM adsConfig WHERE type = '${activeType}' 
              ${activePosition ? `AND position = ${activePosition}` : ""} 
              ${activeSlideNumber ? `AND slideNumber = ${activeSlideNumber}` : ""})
            `)
          ],
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
            attributes: ["id", "name", "address", "ratingAvg"],
          }
        ]
      });

      const responseData = {
        banners: [],
        carousels: [],
        popup: null,
        topDeals: [],
        premiumOutlets: [], // This will be used for both or Home specific
        premiumSearch: [],
        premiumHome: []
      };

      // Process Purchases
      activePurchases.forEach(p => {
        const item = {
          id: p.id,
          locationId: p.locationId,
          locationName: p.location ? p.location.name : null,
          data: p.data,
          isPremiumAd: true,
          referenceType: p.referenceType,
          referenceId: p.referenceId
        };

        if (p.adsType === "BANNER") responseData.banners.push(item);
        else if (p.adsType === "CAROUSEL") responseData.carousels.push(item);
        else if (p.adsType === "POPUP") responseData.popup = item;
        else if (p.adsType === "TOPDEALS") responseData.topDeals.push(item);
        else if (p.adsType === "PREMIUM_SEARCH" || p.adsType === "PREMIUM_BADGE") responseData.premiumSearch.push(item);
        else if (p.adsType === "PREMIUM_HOME") responseData.premiumHome.push(item);
      });

      // Legacy support / merged list for convenience
      responseData.premiumOutlets = [...responseData.premiumSearch, ...responseData.premiumHome];

      // --- Fallback Logic ---

      // 1. Top Deals Fallback (Max 5)
      if (responseData.topDeals.length < 5) {
        const remaining = 5 - responseData.topDeals.length;
        const latestProducts = await masterProduct.findAll({
          where: { isactive: true },
          order: [["createdAt", "DESC"]],
          limit: remaining,
          include: [{ model: masterProductImage, as: "images", limit: 1 }]
        });
        
        latestProducts.forEach(prod => {
          responseData.topDeals.push({
            id: prod.id,
            type: "product",
            name: prod.name,
            price: prod.price,
            image: prod.images && prod.images.length > 0 ? prod.images[0].imageUrl : null,
            isPremiumAd: false
          });
        });
        
        // If still remaining, fetch packages
        if (responseData.topDeals.length < 5) {
          const remPackages = 5 - responseData.topDeals.length;
          const latestPackages = await masterPackage.findAll({
            where: { isactive: true },
            order: [["createdAt", "DESC"]],
            limit: remPackages
          });
          latestPackages.forEach(pkg => {
            responseData.topDeals.push({
              id: pkg.id,
              type: "package",
              name: pkg.name,
              price: pkg.price,
              isPremiumAd: false
            });
          });
        }
      }

      // 2. Premium Outlets Fallback (Max 5)
      if (responseData.premiumOutlets.length < 5) {
        const remaining = 5 - responseData.premiumOutlets.length;
        // Exclude IDs already in responseData.premiumOutlets
        const existingIds = responseData.premiumOutlets.map(p => p.locationId);
        
        const latestOutlets = await masterLocation.findAll({
          where: { 
            isactive: true,
            id: { [Op.notIn]: existingIds.length > 0 ? existingIds : [sequelize.literal("'00000000-0000-0000-0000-000000000000'")] }
          },
          order: [["createdAt", "DESC"]],
          limit: remaining,
          attributes: ["id", "name", "address", "ratingAvg"]
        });

        latestOutlets.forEach(loc => {
          responseData.premiumOutlets.push({
            id: loc.id,
            locationId: loc.id,
            locationName: loc.name,
            address: loc.address,
            rating: loc.ratingAvg,
            isPremiumAd: false
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
  async getOutletAds(adminId) {
    try {
      const transactionOrder = require("./transactionOrder");
      const locationIds = await transactionOrder._getAdminLocationIds(adminId);
      
      const data = await AdsPurchase.findAll({
        where: { locationId: { [Op.in]: locationIds } },
        include: [{ model: AdsConfig, as: "config" }],
        order: [["createdAt", "DESC"]]
      });

      return { status: true, message: "Outlet ads fetched", data };
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
