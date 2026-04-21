const { Op } = require("sequelize");
const { 
  CompanyAdsBalance, 
  CompanyAdsBalanceHistory, 
  masterCompany,
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
  },

  /**
   * Superadmin: Get all company balances
   */
  async getAllCompanyBalances({ page = 1, pageSize = 10, search = "" }) {
    try {
      const limit = parseInt(pageSize);
      const offset = (parseInt(page) - 1) * limit;

      const where = {};
      if (search) {
        where.name = { [Op.like]: `%${search}%` };
      }

      const { count, rows: companies } = await masterCompany.findAndCountAll({
        where,
        attributes: ["id", "name"],
        include: [
          {
            model: CompanyAdsBalance,
            as: "balance", // Make sure to verify the alias in models/index.js
            include: [
              {
                model: CompanyAdsBalanceHistory,
                as: "history",
                where: { type: "TOPUP" },
                required: false,
                limit: 1,
                order: [["createdAt", "DESC"]]
              }
            ]
          }
        ],
        limit,
        offset,
        order: [["name", "ASC"]],
        distinct: true
      });

      const data = companies.map((comp, index) => {
        const balance = comp.balance || {};
        const lastTopupHistory = balance.history && balance.history.length > 0 ? balance.history[0] : null;

        return {
          no: offset + index + 1,
          companyId: comp.id,
          company: comp.name,
          currentBalance: balance.balance || 0,
          lastTopup: lastTopupHistory ? {
              amount: lastTopupHistory.amount,
              date: lastTopupHistory.createdAt
          } : null
        };
      });

      return { 
        status: true, 
        message: "Balances fetched successfully", 
        data: {
          totalCount: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          rows: data
        } 
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }
};
