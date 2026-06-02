const adsService = require("../services/ads.service");
const transactionOrder = require("../services/transactionOrder");
const balanceService = require("../services/balance.service");
const response = require("../helpers/response");

module.exports = {
  /**
   * Superadmin: Get all company balances
   */
  async getCompanyBalances(req, res) {
    try {
      const { page = 1, pageSize = 10, search = "" } = req.query;
      const result = await balanceService.getAllCompanyBalances({ page, pageSize, search });
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  // --- CUSTOMER ---
  async getAds(req, res) {
    try {
      const { latt, long } = req.query;
      const userLat = latt ? parseFloat(latt) : undefined;
      const userLng = long ? parseFloat(long) : undefined;
      const result = await adsService.getActiveAds(userLat, userLng);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  // --- ADMIN COMPANY ---
  async buyAds(req, res) {
    try {
      const userId = req.user.id;
      const data = { ...req.body };

      // Handle adsData if sent as string (common in form-data)
      while (typeof data.adsData === "string") {
        try {
          data.adsData = JSON.parse(data.adsData);
        } catch (e) {
          data.adsData = {};
          break;
        }
      }
      if (!data.adsData || typeof data.adsData !== "object") {
        data.adsData = {};
      }

      // Handle uploaded images
      if (req.files && req.files.length > 0) {
        const imageUrls = req.files.map((file) => {
          return `${process.env.BACKEND_URL || "https://api.myskin.blog"}/uploads/ads/${file.filename}`;
        });
        
        if (!data.adsData) data.adsData = {};
        data.adsData.images = imageUrls;
        // Also set first image as primary if needed by some ads
        data.adsData.imageUrl = imageUrls[0];
      }

      const result = await transactionOrder.buyAds(data, userId);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getAvailableDays(req, res) {
    try {
      const { type, position, slideNumber, month, year, adsConfigId } = req.query;
      const result = await adsService.getAvailableDays(type, position, slideNumber, month, year, adsConfigId);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getOutletAds(req, res) {
    try {
      const { type, name, locationId } = req.query;
      const userId = req.user.id;
      const result = await adsService.getOutletAds(userId, { type, name, locationId });
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async buyTopup(req, res) {
    try {
      const userId = req.user.id;
      const result = await transactionOrder.buyAdBalance(req.body, userId);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getWaitingPaymentAds(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, pageSize = 10 } = req.query;
      const result = await adsService.getWaitingPaymentAds(userId, { 
        page: parseInt(page), 
        pageSize: parseInt(pageSize) 
      });
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getBalance(req, res) {
    try {
      const { companyId } = req.query; // If superadmin
      const userId = req.user.id;
      const { roleCode } = req.user;

      let targetCompanyId = companyId;

      if (roleCode !== "SUPER_ADMIN") {
        const { relationshipUserCompany } = require("../models");
        const link = await relationshipUserCompany.findOne({ where: { userId, isactive: true } });
        if (!link) return response.error(res, "Company not found for user");
        targetCompanyId = link.companyId;
      }

      if (!targetCompanyId) return response.error(res, "companyId is required");

      const result = await balanceService.getBalance(targetCompanyId);
      const history = await balanceService.getHistory(targetCompanyId, { limit: 10 });

      if (!result.status) return response.error(res, result.message);

      return response.success(res, "Success", {
        balance: result.data,
        history: history.data
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  // --- SUPER ADMIN ---
  async createDirectAd(req, res) {
    try {
      const data = { ...req.body };

      // Handle uploaded images
      if (req.files && req.files.length > 0) {
        const imageUrls = req.files.map((file) => {
          return `${process.env.BACKEND_URL || "https://api.myskin.blog"}/uploads/ads/${file.filename}`;
        });
        data.images = imageUrls;
      }

      const result = await adsService.createDirectAd(data);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async adminTopup(req, res) {
    try {
      const { companyId, companyIds, amount, description } = req.body;
      
      if (!amount || parseFloat(amount) <= 0) {
        return response.error(res, "amount is required and must be greater than 0");
      }

      // Support multi-company: companyIds (array) takes priority, fallback to single companyId
      const targetIds = [
        ...(Array.isArray(companyIds) ? companyIds : []),
        ...(companyId ? [companyId] : [])
      ].filter((id, index, self) => id != null && id !== "" && self.indexOf(id) === index);

      if (targetIds.length === 0) {
        return response.error(res, "companyId or companyIds is required");
      }

      const results = [];
      const errors = [];

      for (const cId of targetIds) {
        // Use INITIAL_GRANT for admin additions so they are non-withdrawable (as per free balance rule)
        const result = await balanceService.addBalance(cId, amount, "INITIAL_GRANT", null, description);
        if (result.status) {
          results.push({ 
            companyId: cId, 
            balance: result.data ? result.data.balance : 0, 
            status: "success" 
          });
        } else {
          errors.push({ companyId: cId, message: result.message, status: "failed" });
        }
      }

      return response.success(res, `Balance updated for ${results.length} company(s)${errors.length > 0 ? `, ${errors.length} failed` : ""}`, {
        success: results,
        failed: errors,
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getAdsConfig(req, res) {
    try {
      const { type } = req.query;
      const result = await adsService.getConfig(type);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async upsertAdsConfig(req, res) {
    try {
      const result = await adsService.upsertConfig(req.body);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async bulkUpsertAdsConfig(req, res) {
    try {
      const configs = req.body;
      if (!configs || !Array.isArray(configs)) {
        return response.error(res, "Request body must be an array of configurations");
      }
      const result = await adsService.bulkUpsertConfig(configs);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async updateAdsConfig(req, res) {
    try {
      const { id } = req.params;
      const result = await adsService.updateConfig(id, req.body);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async deleteAdsConfig(req, res) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return response.error(res, "ids (array) is required");
      }
      const result = await adsService.deleteConfig(ids);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
  
  async deleteAds(req, res) {
    try {
      const { id } = req.params;
      const result = await adsService.deleteAds(id);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getAdminActiveAds(req, res) {
    try {
      const result = await adsService.getAdminActiveAds();
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async trackClick(req, res) {
    try {
      const { adsId } = req.body;
      if (!adsId) return response.error(res, "adsId is required");

      const result = await adsService.trackClick(adsId);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, null);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getAdsDashboardSummary(req, res) {
    try {
      const { 
        AdsPurchase, 
        order, 
        AdsConfig, 
        masterLocation, 
        masterCompany, 
        masterProduct, 
        masterService, 
        masterPackage 
      } = require("../models");
      const { Op } = require("sequelize");

      const { 
        companyId, 
        status, 
        startDate, 
        endDate, 
        page = 1, 
        pageSize = 10 
      } = req.query;

      const limit = parseInt(pageSize);
      const offset = (page - 1) * limit;

      const user = req.user;
      const roleCode = user?.roleCode;
      const isGlobalAdmin = ["SUPER_ADMIN", "OPERATIONAL_ADMIN"].includes(roleCode);

      const allowedCompanyIds = user?.companyIds || [];
      const allowedLocationIds = user?.locationIds || [];

      const purchaseInclude = [
        {
          model: order,
          as: "order",
          attributes: ["totalAmount", "paymentStatus"]
        },
        {
          model: AdsConfig,
          as: "config",
          attributes: ["pricePerDay"]
        }
      ];

      if (!isGlobalAdmin) {
        const statsLocationWhere = {};
        if (roleCode === "COMPANY_ADMIN" && allowedCompanyIds.length > 0) {
          statsLocationWhere.companyId = { [Op.in]: allowedCompanyIds };
        } else if (roleCode === "OUTLET_ADMIN" && allowedLocationIds.length > 0) {
          statsLocationWhere.id = { [Op.in]: allowedLocationIds };
        } else {
          statsLocationWhere.id = -1; // force empty
        }

        purchaseInclude.push({
          model: masterLocation,
          as: "location",
          attributes: ["id", "companyId"],
          where: statsLocationWhere,
          required: true
        });
      }

      // 1. Fetch paid purchases for aggregate statistics (filtered for non-global admins)
      const purchases = await AdsPurchase.findAll({
        include: purchaseInclude
      });

      const getRevenue = (p) => {
        if (p.status !== "PAID" && p.order?.paymentStatus !== "PAID") return 0;
        if (p.order?.totalAmount) return parseFloat(p.order.totalAmount);
        if (p.config?.pricePerDay) {
          const diffTime = Math.abs(new Date(p.endDate) - new Date(p.startDate));
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
          return parseFloat(p.config.pricePerDay) * diffDays;
        }
        return 0;
      };

      let totalDbClicks = 0;
      
      const stats = {
        CAROUSEL: { clicks: 0, revenue: 0 },
        BANNER: { clicks: 0, revenue: 0 },
        POPUP: { clicks: 0, revenue: 0 },
        TOPDEALS: { clicks: 0, revenue: 0 },
        PREMIUM_OUTLET: { clicks: 0, revenue: 0 }
      };

      purchases.forEach(p => {
        const clicks = p.clickCount || 0;
        const revenue = getRevenue(p);
        totalDbClicks += clicks;

        let category = "";
        if (p.adsType === "CAROUSEL") {
          category = "CAROUSEL";
        } else if (p.adsType === "BANNER") {
          category = "BANNER";
        } else if (p.adsType === "POPUP") {
          category = "POPUP";
        } else if (p.adsType === "TOPDEALS") {
          category = "TOPDEALS";
        } else if (["PREMIUM_SEARCH", "PREMIUM_BADGE", "PREMIUM_HOME"].includes(p.adsType)) {
          category = "PREMIUM_OUTLET";
        }

        if (category && stats[category]) {
          stats[category].clicks += clicks;
          stats[category].revenue += revenue;
        }
      });

      const carouselClicks = stats.CAROUSEL.clicks;
      const carouselRev = stats.CAROUSEL.revenue;

      const bannerClicks = stats.BANNER.clicks;
      const bannerRev = stats.BANNER.revenue;

      const popupClicks = stats.POPUP.clicks;
      const popupRev = stats.POPUP.revenue;

      const topdealsClicks = stats.TOPDEALS.clicks;
      const topdealsRev = stats.TOPDEALS.revenue;

      const premiumClicks = stats.PREMIUM_OUTLET.clicks;
      const premiumRev = stats.PREMIUM_OUTLET.revenue;

      const sumClicks = carouselClicks + bannerClicks + popupClicks + topdealsClicks + premiumClicks;
      const safePercent = (clicks) => sumClicks > 0 ? Math.round((clicks / sumClicks) * 100) : 0;

      const formatCurrencyPremium = (value) => {
        if (value >= 1000000) {
          return `Rp ${(value / 1000000).toFixed(1)}M`.replace(".0", "");
        }
        if (value >= 1000) {
          return `Rp ${(value / 1000).toFixed(0)}rb`;
        }
        return `Rp ${value}`;
      };

      const performanceList = [
        {
          key: "CAROUSEL",
          label: "CAROUSEL ADS",
          clicks: carouselClicks.toLocaleString("id-ID"),
          clicksRaw: carouselClicks,
          revenue: formatCurrencyPremium(carouselRev),
          revenueRaw: carouselRev,
          change: "+4.2%",
          percentageOfTotalClicks: safePercent(carouselClicks),
          color: "purple"
        },
        {
          key: "BANNER",
          label: "BANNER ADS",
          clicks: bannerClicks.toLocaleString("id-ID"),
          clicksRaw: bannerClicks,
          revenue: formatCurrencyPremium(bannerRev),
          revenueRaw: bannerRev,
          change: "+3.1%",
          percentageOfTotalClicks: safePercent(bannerClicks),
          color: "blue"
        },
        {
          key: "POPUP",
          label: "POPUP ADS",
          clicks: popupClicks.toLocaleString("id-ID"),
          clicksRaw: popupClicks,
          revenue: formatCurrencyPremium(popupRev),
          revenueRaw: popupRev,
          change: "+5.8%",
          percentageOfTotalClicks: safePercent(popupClicks),
          color: "purple"
        },
        {
          key: "TOPDEALS",
          label: "TOP DEALS ADS",
          clicks: topdealsClicks.toLocaleString("id-ID"),
          clicksRaw: topdealsClicks,
          revenue: formatCurrencyPremium(topdealsRev),
          revenueRaw: topdealsRev,
          change: "+2.4%",
          percentageOfTotalClicks: safePercent(topdealsClicks),
          color: "green"
        },
        {
          key: "PREMIUM_OUTLET",
          label: "PREMIUM OUTLET",
          clicks: premiumClicks.toLocaleString("id-ID"),
          clicksRaw: premiumClicks,
          revenue: formatCurrencyPremium(premiumRev),
          revenueRaw: premiumRev,
          change: "+1.9%",
          percentageOfTotalClicks: safePercent(premiumClicks),
          color: "red"
        }
      ];

      // 2. Fetch and filter campaign performance list (the table)
      const whereClause = {};

      if (status && status !== "ALL" && status !== "SEMUA STATUS") {
        const now = new Date();
        if (status === "AKTIF") {
          whereClause.status = "PAID";
          whereClause.isActive = true;
          whereClause.startDate = { [Op.lte]: now };
          whereClause.endDate = { [Op.gte]: now };
        } else if (status === "EXPIRED") {
          whereClause[Op.or] = [
            { status: "EXPIRED" },
            { endDate: { [Op.lt]: now } }
          ];
        } else if (status === "PENDING") {
          whereClause.status = "PENDING";
        } else if (status === "BATAL") {
          whereClause.status = "CANCELLED";
        }
      }

      const parseDate = (dStr) => {
        if (!dStr || dStr === "null" || dStr === "undefined" || dStr === "") return null;
        const d = new Date(dStr);
        return isNaN(d.getTime()) ? null : d;
      };

      const filterStart = parseDate(startDate);
      const filterEnd = parseDate(endDate);

      if (filterStart && filterEnd) {
        whereClause.startDate = { [Op.lte]: filterEnd };
        whereClause.endDate = { [Op.gte]: filterStart };
      } else if (filterStart) {
        whereClause.endDate = { [Op.gte]: filterStart };
      } else if (filterEnd) {
        whereClause.startDate = { [Op.lte]: filterEnd };
      }

      let companyIds = [];
      if (companyId && companyId !== "ALL" && companyId !== "") {
        if (typeof companyId === "string") {
          companyIds = companyId.split(",").map(id => id.trim()).filter(id => id !== "ALL" && id !== "");
        } else if (Array.isArray(companyId)) {
          companyIds = companyId.map(id => String(id).trim()).filter(id => id !== "ALL" && id !== "");
        } else {
          companyIds = [String(companyId)];
        }
      }

      const locationWhere = {};
      if (companyIds.length > 0) {
        locationWhere.companyId = { [Op.in]: companyIds };
      }

      if (!isGlobalAdmin) {
        if (roleCode === "OUTLET_ADMIN") {
          locationWhere.id = { [Op.in]: allowedLocationIds };
        } else if (roleCode === "COMPANY_ADMIN") {
          const allowedStr = allowedCompanyIds.map(String);
          if (companyIds.length > 0) {
            companyIds = companyIds.filter(id => allowedStr.includes(String(id)));
            if (companyIds.length === 0) {
              companyIds = [-1]; // force empty
            }
            locationWhere.companyId = { [Op.in]: companyIds };
          } else {
            locationWhere.companyId = { [Op.in]: allowedCompanyIds };
          }
        }
      }

      const { count: totalCampaigns, rows: campaignRows } = await AdsPurchase.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "companyId"],
            required: !isGlobalAdmin || companyIds.length > 0,
            where: locationWhere,
            include: [
              {
                model: masterCompany,
                as: "company",
                attributes: ["id", "name"]
              }
            ]
          },
          { model: masterProduct, as: "product", attributes: ["id", "name"], required: false },
          { model: masterService, as: "service", attributes: ["id", "name"], required: false },
          { model: masterPackage, as: "package", attributes: ["id", "name"], required: false }
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset
      });

      const formatIndonesianDate = (dateString) => {
        if (!dateString) return "-";
        const months = [
          "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
          "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
        ];
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "-";
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      };

      const mappedCampaigns = campaignRows.map(p => {
        let title = "";
        if (p.data && (p.data.title || p.data.name)) {
          title = p.data.title || p.data.name;
        } else if (p.adsType === "TOPDEALS") {
          if (p.referenceType === "PRODUCT" && p.product) title = p.product.name;
          else if (p.referenceType === "SERVICE" && p.service) title = p.service.name;
          else if (p.referenceType === "PACKAGE" && p.package) title = p.package.name;
        } else if (["PREMIUM_SEARCH", "PREMIUM_BADGE", "PREMIUM_HOME"].includes(p.adsType)) {
          title = p.location?.name ? `Premium Ad - ${p.location.name}` : "Premium Ad";
        }
        if (!title) {
          title = `${p.adsType.charAt(0) + p.adsType.slice(1).toLowerCase().replace("_", " ")} Ad`;
        }

        const now = new Date();
        let computedStatus = "TIDAK AKTIF";
        if (p.status === "PAID" && p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now) {
          computedStatus = "AKTIF";
        } else if (p.status === "EXPIRED" || new Date(p.endDate) < now) {
          computedStatus = "EXPIRED";
        } else if (p.status === "PENDING") {
          computedStatus = "PENDING";
        } else if (p.status === "CANCELLED") {
          computedStatus = "BATAL";
        }

        return {
          id: p.id,
          title,
          adsType: p.adsType,
          companyName: p.location?.company?.name || "-",
          locationName: p.location?.name || "-",
          clickCount: p.clickCount || 0,
          startDate: p.startDate,
          endDate: p.endDate,
          periodeAktif: `${formatIndonesianDate(p.startDate)} s/d ${formatIndonesianDate(p.endDate)}`,
          status: computedStatus
        };
      });

      return response.success(res, "Ads dashboard summary fetched successfully", {
        metrics: {
          totalAdClicks: {
            value: sumClicks.toLocaleString("id-ID"),
            valueRaw: sumClicks,
            change: "+8.4%"
          }
        },
        performance: performanceList,
        campaigns: {
          rows: mappedCampaigns,
          totalCount: totalCampaigns,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  }
};
