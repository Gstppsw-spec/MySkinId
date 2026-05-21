const { Op } = require("sequelize");
const { 
  CompanyAdsBalance, 
  CompanyAdsBalanceHistory, 
  CompanyWithdrawal,
  masterCompany,
  masterLocation,
  platformTransfer,
  sequelize 
} = require("../models");
const payoutService = require("./payout.service");

module.exports = {
  /**
   * Get balance for a company. 
   * Auto-creates balance record if it doesn't exist.
   */
  async getBalance(companyId) {
    if (!companyId) return { status: false, message: "companyId is required" };
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
  async spendBalance(companyId, amount, referenceId, description, externalTransaction = null) {
    if (!companyId) throw new Error("companyId is required for balance deduction");
    const t = externalTransaction || (await sequelize.transaction());
    try {
      const balanceRecord = await CompanyAdsBalance.findOne({
        where: { companyId },
        transaction: t,
        lock: true
      });

      // Deduct from nonWithdrawableBalance first (for "Free" balance prioritization)
      const currentNonWithdrawable = parseFloat(balanceRecord.nonWithdrawableBalance || 0);
      const spendFromFree = Math.min(currentNonWithdrawable, parseFloat(amount));
      const newNonWithdrawable = currentNonWithdrawable - spendFromFree;

      const newBalance = parseFloat(balanceRecord.balance) - parseFloat(amount);
      await balanceRecord.update({ 
        balance: newBalance,
        nonWithdrawableBalance: newNonWithdrawable
      }, { transaction: t });

      await CompanyAdsBalanceHistory.create({
        balanceId: balanceRecord.id,
        type: "SPEND",
        amount,
        referenceId,
        description
      }, { transaction: t });

      if (!externalTransaction) await t.commit();
      return { status: true, message: "Balance deducted successfully", data: balanceRecord };
    } catch (error) {
      if (!externalTransaction && t) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  /**
   * Add balance (Topup or Grant)
   */
  async addBalance(companyId, amount, type = "TOPUP", referenceId = null, description = null) {
    if (!companyId) {
      return { status: false, message: "companyId is required for balance update" };
    }

    const t = await sequelize.transaction();
    try {
      let balanceRecord = await CompanyAdsBalance.findOne({
        where: { companyId: companyId },
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

      // INITIAL_GRANT is non-withdrawable
      if (type === "INITIAL_GRANT") {
        updateData.nonWithdrawableBalance = parseFloat(balanceRecord.nonWithdrawableBalance || 0) + parseFloat(amount);
      }

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
    if (!companyId) return { status: true, message: "No history found", data: [] };
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
  },

  /**
   * Get detailed balance info including withdrawable amount.
   * Topups less than 3 days old are "on hold" and cannot be withdrawn.
   */
  async getCompanyBalanceInfo(companyId) {
    try {
      const res = await this.getBalance(companyId);
      if (!res.status) return res;

      const record = res.data;
      const storedBalance = parseFloat(record.balance || 0);
      const nonWithdrawable = parseFloat(record.nonWithdrawableBalance || 0);

      // Get locations under this company
      const locations = await masterLocation.findAll({
        where: { companyId },
        attributes: ["id"]
      });
      const locationIds = locations.map(loc => loc.id);

      // Calculate pending settlements sum
      let pendingTransfersAmount = 0;
      if (locationIds.length > 0) {
        const pendingTransfers = await platformTransfer.findAll({
          where: {
            locationId: { [Op.in]: locationIds },
            status: "PENDING_SETTLEMENT"
          }
        });
        pendingTransfersAmount = pendingTransfers.reduce((sum, pt) => sum + parseFloat(pt.amount || 0), 0);
      }

      // Calculate hold balance: sum of TOPUP amounts less than 3 days old
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const recentTopups = await CompanyAdsBalanceHistory.findAll({
        where: {
          balanceId: record.id,
          type: "TOPUP",
          createdAt: { [Op.gt]: threeDaysAgo }
        }
      });

      const recentTopupsAmount = recentTopups.reduce((sum, h) => sum + parseFloat(h.amount || 0), 0);

      // holdBalance includes recent topups AND pending settlements
      const holdBalance = recentTopupsAmount + pendingTransfersAmount;

      // totalBalance includes stored balance AND pending settlements
      const totalBalance = storedBalance + pendingTransfersAmount;

      const withdrawable = Math.max(0, totalBalance - nonWithdrawable - holdBalance);

      return {
        status: true,
        message: "Balance info fetched",
        data: {
          totalBalance,
          nonWithdrawableBalance: nonWithdrawable,
          holdBalance,
          withdrawableBalance: withdrawable
        }
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Withdraw balance for a company (Instant Payout)
   */
  async withdrawBalance(companyId, amount) {
    if (!companyId || !amount || amount <= 0) {
      return { status: false, message: "Invalid companyId or amount" };
    }

    const t = await sequelize.transaction();
    try {
      // 1. Get current balance & info
      const balanceRes = await this.getCompanyBalanceInfo(companyId);
      if (!balanceRes.status) throw new Error(balanceRes.message);

      const { withdrawableBalance, totalBalance } = balanceRes.data;
      if (withdrawableBalance < parseFloat(amount)) {
        throw new Error(`Insufficient withdrawable balance. Max withdrawable: ${withdrawableBalance.toLocaleString("id-ID")}`);
      }

      // 2. Get company bank details
      const company = await masterCompany.findByPk(companyId);
      if (!company || !company.bankAccountNumber || !company.bankName) {
        throw new Error("Company bank details are incomplete. Please update bank name and account number first.");
      }

      // 3. Create Withdrawal Record (PENDING)
      const withdrawal = await CompanyWithdrawal.create({
        companyId,
        amount,
        bankName: company.bankName,
        bankAccountName: company.bankAccountName || company.name,
        bankAccountNumber: company.bankAccountNumber,
        status: "PENDING"
      }, { transaction: t });

      // 4. Deduct Balance
      const balanceRecord = await CompanyAdsBalance.findOne({ where: { companyId }, transaction: t, lock: true });
      const newBalance = parseFloat(balanceRecord.balance) - parseFloat(amount);
      await balanceRecord.update({ balance: newBalance }, { transaction: t });

      // 5. Create History
      await CompanyAdsBalanceHistory.create({
        balanceId: balanceRecord.id,
        type: "WITHDRAWAL",
        amount,
        referenceId: withdrawal.id,
        description: `Withdrawal to ${company.bankName} ${company.bankAccountNumber}`
      }, { transaction: t });

      await t.commit();

      // 6. Trigger Xendit Payout (Asynchronous/Immediate as per requirement)
      const xenditRes = await payoutService.createDisbursement({
        amount: parseFloat(amount) - 2500,
        bankCode: company.bankName, // Assuming bankName matches Xendit codes, or needs mapping
        accountHolderName: company.bankAccountName || company.name,
        accountNumber: company.bankAccountNumber,
        externalId: withdrawal.id,
        description: `Withdrawal from MySkinId - ${company.name}`
      });

      if (xenditRes.status) {
        await withdrawal.update({
          status: "SUCCESS",
          xenditId: xenditRes.data.id
        });
        return { status: true, message: "Withdrawal successful and processed", data: withdrawal };
      } else {
        // If Xendit fails, we should technically revert or mark as FAILED for admin review
        // But since it's "instant", we'll mark as FAILED and maybe suggest user to retry or contact support
        await withdrawal.update({
          status: "FAILED",
          errorMessage: xenditRes.message
        });
        return { status: false, message: `Withdrawal requested but transfer failed: ${xenditRes.message}. Please contact support.`, data: withdrawal };
      }

    } catch (error) {
      if (t) await t.rollback();
      return { status: false, message: error.message };
    }
  }
};
