const { Op, Sequelize } = require("sequelize");
const {
  AdsConfig,
  AdsPurchase,
  masterLocation,
  masterLocationImage,
  masterCity,
  masterCompany,
  masterProduct,
  masterProductImage,
  masterProductCategory,
  masterConsultationCategory,
  masterService,
  masterSubCategoryService,
  masterPackage,
  masterPackageItems,
  flashSale,
  flashSaleItem,
  order,
  orderPayment,
  transaction,
  transactionItem,
  relationshipUserCompany,
  masterUser,
  masterRole,
  sequelize,
} = require("../models");
const { sortPrimaryFirst } = require("../helpers/sortPrimaryImage");
const flashSaleService = require("./flashSale.service");

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

      // 1. Fetch all active paid ads
      const activePurchases = await AdsPurchase.findAll({
        where: {
          status: "PAID",
          isActive: true,
          startDate: { [Op.lte]: now },
          endDate: { [Op.gte]: now },
        },
      });

      // 2. Identify referenced entities to bulk fetch
      const productIds = [];
      const serviceIds = [];
      const packageIds = [];
      const locationIds = [];

      activePurchases.forEach(p => {
        if (p.adsType === "TOPDEALS") {
          if (p.referenceType === "PRODUCT") productIds.push(p.referenceId);
          if (p.referenceType === "SERVICE") serviceIds.push(p.referenceId);
          if (p.referenceType === "PACKAGE") packageIds.push(p.referenceId);
        }
        if (["PREMIUM_SEARCH", "PREMIUM_BADGE", "PREMIUM_HOME"].includes(p.adsType)) {
          locationIds.push(p.locationId);
        }
      });

      // Also need location details for Products/Services/Packages
      const allLocationIds = [...new Set(locationIds)];

      // 3. Bulk fetch full details
      const [products, services, packages, locations, activeFlashSales] = await Promise.all([
        // Products
        masterProduct.findAll({
          where: { id: { [Op.in]: productIds } },
          include: [
            { model: masterProductImage, as: "images", attributes: ["id", "imageUrl", "isPrimary"], separate: true },
            { model: masterLocation, as: "locations", attributes: ["id", "name", "latitude", "longitude", "cityId", "districtId", "biteshipAreaId"], through: { attributes: ["isActive"] } }
          ]
        }),
        // Services
        masterService.findAll({
          where: { id: { [Op.in]: serviceIds } },
          include: [
            { model: masterLocation, as: "locations", attributes: ["id", "name", "latitude", "longitude", "cityId", "districtId", "biteshipAreaId"], through: { attributes: ["isActive"] } }
          ]
        }),
        // Packages
        masterPackage.findAll({
          where: { id: { [Op.in]: packageIds } },
          include: [
            { model: masterLocation, as: "locations", attributes: ["id", "name", "latitude", "longitude", "cityId", "districtId", "biteshipAreaId"], through: { attributes: ["isActive"] } }
          ]
        }),
        // Locations (for Premium Outlets and detailing TopDeals)
        masterLocation.findAll({
          where: { id: { [Op.in]: allLocationIds } },
          include: [
            { model: masterLocationImage, as: "images", attributes: ["id", "imageUrl", "isPrimary"], separate: true },
            { model: masterCity, as: "cityDetail", attributes: ["name"] },
            { model: masterCompany, as: "company", attributes: ["id", "name"] }
          ]
        }),
        // Flash Sales
        (async () => {
          await flashSaleService.syncStatuses();
          return flashSale.findAll({
            where: { status: "ACTIVE" },
            include: [{ model: flashSaleItem, as: "items" }]
          });
        })()
      ]);

      const responseData = {
        banners: null,
        carousels: null,
        popup: null,
        topDeals: null,
        premiumOutlets: [],
        premiumSearch: [],
        premiumHome: [],
      };

      // Helper: Map entity to standard structure
      const mapItem = (p, entity, type) => {
        const plain = entity.get({ plain: true });
        
        // Handle images
        if (plain.images) plain.images = sortPrimaryFirst(plain.images);
        
        // Handle Flash Sale
        let flashSaleInfo = null;
        let isFlashSale = false;
        if (type !== "SERVICE") {
          const fs = activeFlashSales.find(fs => 
            fs.items.some(i => 
              (type === "PRODUCT" && i.itemType === "PRODUCT" && i.productId === plain.id) ||
              (type === "PACKAGE" && i.packageId === plain.id)
            )
          );
          if (fs) {
            const item = fs.items.find(i => 
              (type === "PRODUCT" && i.productId === plain.id) ||
              (type === "PACKAGE" && i.packageId === plain.id)
            );
            isFlashSale = true;
            flashSaleInfo = {
              flashPrice: item.flashPrice,
              flashSaleId: fs.id,
              flashSaleItemId: item.id,
              titleFlashSale: fs.title,
              quota: item.quota,
              sold: item.sold,
              endDateFlashSale: fs.endDate,
            };
          }
        }

        // Handle Location (match generic getter: pick the one assigned in AdsPurchase)
        const loc = plain.locations ? plain.locations.find(l => l.id === p.locationId) : null;

        return {
          ...plain,
          biteshipId: loc?.biteshipAreaId || null,
          isFlashSale,
          flashSale: flashSaleInfo,
          isFavorite: false, // Default false for public ads endpoint
          locationId: p.locationId,
          location: loc || null,
          isAd: true,
          adsPurchaseId: p.id, // Keep reference to ads record
          data: p.data // Banner/Carousel custom data
        };
      };

      // 4. Process Purchases
      activePurchases.forEach((p) => {
        if (p.adsType === "BANNER") {
          if (!responseData.banners) responseData.banners = [];
          responseData.banners.push({ id: p.id, data: p.data, locationId: p.locationId, isAd: true });
        } else if (p.adsType === "CAROUSEL") {
          if (!responseData.carousels) responseData.carousels = [];
          responseData.carousels.push({ id: p.id, data: p.data, locationId: p.locationId, isAd: true });
        } else if (p.adsType === "POPUP") {
          responseData.popup = { id: p.id, data: p.data, locationId: p.locationId, isAd: true };
        } else if (p.adsType === "TOPDEALS") {
          if (!responseData.topDeals) responseData.topDeals = { product: [], service: [], package: [] };
          
          let entity = null;
          if (p.referenceType === "PRODUCT") entity = products.find(i => i.id === p.referenceId);
          if (p.referenceType === "SERVICE") entity = services.find(i => i.id === p.referenceId);
          if (p.referenceType === "PACKAGE") entity = packages.find(i => i.id === p.referenceId);

          if (entity) {
            const mapped = mapItem(p, entity, p.referenceType);
            responseData.topDeals[p.referenceType.toLowerCase()].push(mapped);
          }
        } else if (["PREMIUM_SEARCH", "PREMIUM_BADGE", "PREMIUM_HOME"].includes(p.adsType)) {
          const locEntity = locations.find(l => l.id === p.locationId);
          if (locEntity) {
            const plain = locEntity.get({ plain: true });
            if (plain.images) plain.images = sortPrimaryFirst(plain.images);
            
            const item = {
              ...plain,
              city: plain.cityDetail ? plain.cityDetail.name : plain.city,
              isAd: true,
              adsType: p.adsType
            };

            if (p.adsType === "PREMIUM_HOME") responseData.premiumHome.push(item);
            else responseData.premiumSearch.push(item);
          }
        }
      });

      responseData.premiumOutlets = [...responseData.premiumSearch, ...responseData.premiumHome];

      // 5. Fallback Logic for Premium Outlets
      if (responseData.premiumOutlets.length === 0) {
        const latestOutlets = await masterLocation.findAll({
          where: { isactive: true, isVerified: true },
          include: [
            { model: masterLocationImage, as: "images", attributes: ["id", "imageUrl", "isPrimary"], separate: true },
            { model: masterCity, as: "cityDetail", attributes: ["name"] }
          ],
          order: [["isPremium", "DESC"], ["createdAt", "DESC"]],
          limit: 5
        });

        latestOutlets.forEach((loc) => {
          const plain = loc.get({ plain: true });
          if (plain.images) plain.images = sortPrimaryFirst(plain.images);
          responseData.premiumOutlets.push({
            ...plain,
            city: plain.cityDetail ? plain.cityDetail.name : plain.city,
            isAd: false,
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
        if (type === "PREMIUM_OUTLET") {
          where.adsType = { [Op.in]: ["PREMIUM_SEARCH", "PREMIUM_BADGE", "PREMIUM_HOME"] };
        } else {
          where.adsType = type;
        }
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
