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
      const result = await adsService.getActiveAds();
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

      const balanceService = require("../services/balance.service");
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
  async adminTopup(req, res) {
    try {
      const { companyId, amount, description } = req.body;
      const balanceService = require("../services/balance.service");
      const result = await balanceService.addBalance(companyId, amount, "TOPUP", null, description);
      
      if (!result.status) return response.error(res, result.message);
      return response.success(res, "Balance updated successfully", result.data);
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
    },
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
  }
};
