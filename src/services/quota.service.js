const {
  ConsultationQuota,
  ConsultationQuotaConfig,
  masterCustomer,
  sequelize
} = require("../models");
const { Op } = require("sequelize");

module.exports = {
  /**
   * Get quota summary for a customer
   */
  async getUserQuota(customerId) {
    try {
      const customer = await masterCustomer.findByPk(customerId);
      if (!customer) {
        return { 
          status: false, 
          message: "Akses ditolak. Fitur kuota hanya tersedia untuk akun customer." 
        };
      }

      let quotaRecord = await ConsultationQuota.findOne({
        where: { customerId }
      });

      if (!quotaRecord) {
        quotaRecord = await ConsultationQuota.create({
          customerId,
          purchasedBalance: 0,
          lastFreeQuotaUsedAt: null
        });
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let hasFreeQuota = true;
      if (quotaRecord.lastFreeQuotaUsedAt) {
        const lastUsed = new Date(quotaRecord.lastFreeQuotaUsedAt);
        if (
          lastUsed.getMonth() === currentMonth &&
          lastUsed.getFullYear() === currentYear
        ) {
          hasFreeQuota = false;
        }
      }

      return {
        status: true,
        message: "Quota fetched successfully",
        data: {
          freeQuotaAvailable: hasFreeQuota ? 1 : 0,
          purchasedBalance: quotaRecord.purchasedBalance,
          totalQuota: (hasFreeQuota ? 1 : 0) + quotaRecord.purchasedBalance,
          lastFreeQuotaUsedAt: quotaRecord.lastFreeQuotaUsedAt
        }
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Logic to check and deduct quota when creating a room
   */
  async checkAndConsumeQuota(customerId, t = null) {
    const transaction = t || await sequelize.transaction();
    try {
      const customer = await masterCustomer.findByPk(customerId);
      if (!customer) {
        throw new Error("Akses ditolak. Fitur kuota hanya tersedia untuk akun customer.");
      }

      let quotaRecord = await ConsultationQuota.findOne({
        where: { customerId },
        transaction,
        lock: true
      });

      if (!quotaRecord) {
        quotaRecord = await ConsultationQuota.create({
          customerId,
          purchasedBalance: 0,
          lastFreeQuotaUsedAt: null
        }, { transaction });
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let hasFreeQuota = true;
      if (quotaRecord.lastFreeQuotaUsedAt) {
        const lastUsed = new Date(quotaRecord.lastFreeQuotaUsedAt);
        if (
          lastUsed.getMonth() === currentMonth &&
          lastUsed.getFullYear() === currentYear
        ) {
          hasFreeQuota = false;
        }
      }

      if (hasFreeQuota) {
        // Use free quota
        await quotaRecord.update({ lastFreeQuotaUsedAt: now }, { transaction });
      } else if (quotaRecord.purchasedBalance > 0) {
        // Use paid quota
        await quotaRecord.update(
          { purchasedBalance: quotaRecord.purchasedBalance - 1 },
          { transaction }
        );
      } else {
        throw new Error("Kuota konsultasi Anda telah habis. Silakan beli kuota tambahan.");
      }

      if (!t) await transaction.commit();
      return { status: true, message: "Quota consumed successfully" };
    } catch (error) {
      if (!t) await transaction.rollback();
      return { status: false, message: error.message };
    }
  },

  /**
   * Get quota configuration (pricing & bonus)
   */
  async getQuotaConfig() {
    try {
      let config = await ConsultationQuotaConfig.findOne({
        where: { isActive: true },
        order: [["createdAt", "DESC"]]
      });

      if (!config) {
        // Create default config if none exists
        config = await ConsultationQuotaConfig.create({
          quotaPrice: 50000, // Default price 50k
          buyThreshold: 0,
          bonusQuota: 0,
          isActive: true
        });
      }

      return { status: true, message: "Success", data: config };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Update quota configuration
   */
  async updateQuotaConfig(payload = {}) {
    try {
      console.log("[QuotaService] Update payload received:", payload);
      const { quotaPrice, buyThreshold, bonusQuota } = payload || {};
      
      // Deactivate old configs
      await ConsultationQuotaConfig.update(
        { isActive: false },
        { where: { isActive: true } }
      );

      const newConfig = await ConsultationQuotaConfig.create({
        quotaPrice,
        buyThreshold: buyThreshold || 0,
        bonusQuota: bonusQuota || 0,
        isActive: true
      });

      return { status: true, message: "Config updated successfully", data: newConfig };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }
};
