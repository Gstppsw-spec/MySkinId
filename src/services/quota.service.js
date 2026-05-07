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

      const configResult = await this.getQuotaConfig();
      const monthlyFreeQuota = configResult.status ? configResult.data.monthlyFreeQuota : 1;

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
          freeQuotaAvailable: hasFreeQuota ? monthlyFreeQuota : 0,
          purchasedBalance: quotaRecord.purchasedBalance,
          totalQuota: (hasFreeQuota ? monthlyFreeQuota : 0) + quotaRecord.purchasedBalance,
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

      const configResult = await this.getQuotaConfig();
      const monthlyFreeQuota = configResult.status ? configResult.data.monthlyFreeQuota : 1;

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
          monthlyFreeQuota: 1,
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
      const { quotaPrice, buyThreshold, bonusQuota, monthlyFreeQuota } = payload || {};
      
      // Deactivate old configs
      await ConsultationQuotaConfig.update(
        { isActive: false },
        { where: { isActive: true } }
      );

      const newConfig = await ConsultationQuotaConfig.create({
        quotaPrice,
        buyThreshold: buyThreshold || 0,
        bonusQuota: bonusQuota || 0,
        monthlyFreeQuota: monthlyFreeQuota !== undefined ? monthlyFreeQuota : 1,
        isActive: true
      });

      return { status: true, message: "Config updated successfully", data: newConfig };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Get all user quotas (Admin only)
   */
  async getAllUserQuotas(filters = {}) {
    try {
      const { page = 1, pageSize = 10, search } = filters;
      const offset = (page - 1) * pageSize;

      const where = {};
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await masterCustomer.findAndCountAll({
        where,
        attributes: ["id", "name", "username", "email", "profileImageUrl"],
        include: [
          {
            model: ConsultationQuota,
            as: "consultationQuota",
            required: false
          }
        ],
        limit: pageSize,
        offset,
        order: [["name", "ASC"]]
      });

      const configResult = await this.getQuotaConfig();
      const monthlyFreeQuota = configResult.status ? configResult.data.monthlyFreeQuota : 1;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const enrichedRows = rows.map(customer => {
        const quota = customer.consultationQuota;
        let hasFreeQuota = true;
        if (quota && quota.lastFreeQuotaUsedAt) {
          const lastUsed = new Date(quota.lastFreeQuotaUsedAt);
          if (
            lastUsed.getMonth() === currentMonth &&
            lastUsed.getFullYear() === currentYear
          ) {
            hasFreeQuota = false;
          }
        }

        return {
          id: customer.id,
          name: customer.name,
          username: customer.username,
          email: customer.email,
          profileImageUrl: customer.profileImageUrl,
          purchasedBalance: quota ? quota.purchasedBalance : 0,
          freeQuotaAvailable: hasFreeQuota ? monthlyFreeQuota : 0,
          totalQuota: (hasFreeQuota ? monthlyFreeQuota : 0) + (quota ? quota.purchasedBalance : 0),
          lastFreeQuotaUsedAt: quota ? quota.lastFreeQuotaUsedAt : null
        };
      });

      return {
        status: true,
        message: "All user quotas fetched successfully",
        data: {
          totalItems: count,
          rows: enrichedRows
        }
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Manually update user quota balance (Admin only)
   */
  async updateUserQuotaBalance(customerId, purchasedBalance) {
    try {
      if (purchasedBalance === undefined || isNaN(purchasedBalance)) {
        return { status: false, message: "Purchased balance must be a number" };
      }

      let quotaRecord = await ConsultationQuota.findOne({
        where: { customerId }
      });

      if (!quotaRecord) {
        quotaRecord = await ConsultationQuota.create({
          customerId,
          purchasedBalance: parseInt(purchasedBalance),
          lastFreeQuotaUsedAt: null
        });
      } else {
        await quotaRecord.update({ purchasedBalance: parseInt(purchasedBalance) });
      }

      return { 
        status: true, 
        message: "User quota updated successfully", 
        data: quotaRecord 
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Bulk update user quota balance (Admin only)
   */
  async bulkUpdateUserQuotaBalance(customerIds, purchasedBalance) {
    try {
      if (!Array.isArray(customerIds) || customerIds.length === 0) {
        return { status: false, message: "customerIds must be a non-empty array" };
      }
      if (purchasedBalance === undefined || isNaN(purchasedBalance)) {
        return { status: false, message: "Purchased balance must be a number" };
      }

      const balance = parseInt(purchasedBalance);
      const results = [];

      for (const customerId of customerIds) {
        let quotaRecord = await ConsultationQuota.findOne({ where: { customerId } });
        if (!quotaRecord) {
          quotaRecord = await ConsultationQuota.create({
            customerId,
            purchasedBalance: balance,
            lastFreeQuotaUsedAt: null
          });
        } else {
          await quotaRecord.update({ purchasedBalance: balance });
        }
        results.push(quotaRecord);
      }

      return { 
        status: true, 
        message: `Successfully updated quota for ${results.length} users`, 
        data: results 
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }
};
