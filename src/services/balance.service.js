const { 
  CompanyAdsBalance, 
  CompanyAdsBalanceHistory, 
  sequelize 
} = require("../models");

module.exports = {
  /**
   * Get balance for a company. 
   * Auto-creates balance record if it doesn't exist.
   */
  async getBalance(companyId) {
    try {
      let balanceRecord = await CompanyAdsBalance.findOne({
        where: { companyId }
      });

      if (!balanceRecord) {
        balanceRecord = await CompanyAdsBalance.create({
          companyId,
          balance: 0
        });
      }

      return { status: true, message: "Success", data: balanceRecord };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Spend balance for an ad purchase
   */
  async spendBalance(companyId, amount, referenceId, description) {
    const t = await sequelize.transaction();
    try {
      const balanceRecord = await CompanyAdsBalance.findOne({
        where: { companyId },
        transaction: t,
        lock: true
      });

      if (!balanceRecord || parseFloat(balanceRecord.balance) < parseFloat(amount)) {
        throw new Error("Insufficient balance");
      }

      const newBalance = parseFloat(balanceRecord.balance) - parseFloat(amount);
      await balanceRecord.update({ balance: newBalance }, { transaction: t });

      await CompanyAdsBalanceHistory.create({
        balanceId: balanceRecord.id,
        type: "SPEND",
        amount,
        referenceId,
        description
      }, { transaction: t });

      await t.commit();
      return { status: true, message: "Balance deducted successfully", data: balanceRecord };
    } catch (error) {
      if (t) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  /**
   * Add balance (Topup or Grant)
   */
  async addBalance(companyId, amount, type = "TOPUP", referenceId = null, description = null) {
    const t = await sequelize.transaction();
    try {
      let balanceRecord = await CompanyAdsBalance.findOne({
        where: { companyId },
        transaction: t,
        lock: true
      });

      if (!balanceRecord) {
        balanceRecord = await CompanyAdsBalance.create({
          companyId,
          balance: 0
        }, { transaction: t });
      }

      const newBalance = parseFloat(balanceRecord.balance) + parseFloat(amount);
      const updateData = { balance: newBalance };
      if (type === "TOPUP") updateData.lastTopupAt = new Date();

      await balanceRecord.update(updateData, { transaction: t });

      await CompanyAdsBalanceHistory.create({
        balanceId: balanceRecord.id,
        type,
        amount,
        referenceId,
        description: description || `${type} of ${amount}`
      }, { transaction: t });

      await t.commit();
      return { status: true, message: "Balance added successfully", data: balanceRecord };
    } catch (error) {
      if (t) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  /**
   * Get balance history list
   */
  async getHistory(companyId, pagination = {}) {
    try {
      const { limit, offset } = pagination;
      const balanceRecord = await CompanyAdsBalance.findOne({
        where: { companyId }
      });

      if (!balanceRecord) return { status: true, message: "No history found", data: [] };

      const { count, rows: data } = await CompanyAdsBalanceHistory.findAndCountAll({
        where: { balanceId: balanceRecord.id },
        order: [["createdAt", "DESC"]],
        limit,
        offset
      });

      return { status: true, message: "Success", data, totalCount: count };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }
};
