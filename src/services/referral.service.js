const { Op } = require("sequelize");
const {
  masterCustomer,
  referralPoints,
  referralBalance,
  referralWithdrawal,
  order,
  transaction,
  sequelize,
} = require("../models");
const { nanoid } = require("nanoid");
const pushNotificationService = require("./pushNotification.service");
const NotificationService = require("./notification.service");

const MIN_WITHDRAWAL_AMOUNT = 100000; // Rp 100.000
const FIRST_TRANSACTION_RATE = 3; // 3%
const SUBSEQUENT_TRANSACTION_RATE = 1; // 1%

module.exports = {
  /**
   * Generate a unique referral code for a customer.
   * Format: MSK-XXXXXX (6 alphanumeric characters)
   * If the customer already has a code, return the existing one.
   */
  async generateReferralCode(customerId) {
    try {
      const customer = await masterCustomer.findByPk(customerId);
      if (!customer) {
        return { status: false, message: "Customer tidak ditemukan" };
      }

      // Return existing code if already generated
      if (customer.referralCode) {
        return {
          status: true,
          message: "Referral code sudah ada",
          data: { referralCode: customer.referralCode },
        };
      }

      // Generate unique code with retry
      let code = null;
      let attempts = 0;
      while (!code && attempts < 10) {
        const candidate = `MSK-${nanoid(6).toUpperCase()}`;
        const existing = await masterCustomer.findOne({
          where: { referralCode: candidate },
        });
        if (!existing) {
          code = candidate;
        }
        attempts++;
      }

      if (!code) {
        return { status: false, message: "Gagal generate referral code, coba lagi" };
      }

      await customer.update({ referralCode: code });

      return {
        status: true,
        message: "Referral code berhasil dibuat",
        data: { referralCode: code },
      };
    } catch (error) {
      console.error("[Referral] generateReferralCode error:", error.message);
      return { status: false, message: error.message };
    }
  },

  /**
   * Get referral info for a customer: code, link, stats, and balance.
   * Auto-generates referral code if not yet created.
   */
  async getReferralInfo(customerId) {
    try {
      const customer = await masterCustomer.findByPk(customerId);
      if (!customer) {
        return { status: false, message: "Customer tidak ditemukan" };
      }

      // Auto-generate if no code yet
      if (!customer.referralCode) {
        const genResult = await this.generateReferralCode(customerId);
        if (!genResult.status) return genResult;
      }

      // Reload to get the updated referralCode
      await customer.reload();

      // Count referred customers
      const referredCount = await masterCustomer.count({
        where: { referredBy: customerId, isActive: true },
      });

      // Get or create balance
      let balance = await referralBalance.findOne({
        where: { customerId },
      });
      if (!balance) {
        balance = await referralBalance.create({
          customerId,
          balance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
        });
      }

      const baseUrl = process.env.WEB_URL || "https://myskin.blog";
      const referralLink = `${baseUrl}?ref=${customer.referralCode}`;

      return {
        status: true,
        message: "Referral info berhasil diambil",
        data: {
          referralCode: customer.referralCode,
          referralLink,
          referredCount,
          balance: parseFloat(balance.balance),
          totalEarned: parseFloat(balance.totalEarned),
          totalWithdrawn: parseFloat(balance.totalWithdrawn),
        },
      };
    } catch (error) {
      console.error("[Referral] getReferralInfo error:", error.message);
      return { status: false, message: error.message };
    }
  },

  /**
   * Apply a referral code to a newly registered customer.
   * Called during registration flow.
   *
   * Validations:
   * - Referral code must be valid
   * - New customer must not already have a referrer
   * - Self-referral prevention (same email/phone)
   */
  async applyReferral(newCustomerId, referralCode) {
    try {
      if (!referralCode) return { status: true, message: "No referral code provided" };

      const newCustomer = await masterCustomer.findByPk(newCustomerId);
      if (!newCustomer) {
        return { status: false, message: "Customer tidak ditemukan" };
      }

      // Already has a referrer
      if (newCustomer.referredBy) {
        return { status: false, message: "Customer sudah memiliki referrer" };
      }

      // Find referrer by code
      const referrer = await masterCustomer.findOne({
        where: { referralCode: referralCode.toUpperCase() },
      });

      if (!referrer) {
        return { status: false, message: "Kode referral tidak valid" };
      }

      // Self-referral prevention: check if same person (same email or phone)
      if (referrer.id === newCustomerId) {
        return { status: false, message: "Tidak bisa menggunakan kode referral sendiri" };
      }

      if (
        (newCustomer.email && referrer.email && newCustomer.email === referrer.email) ||
        (newCustomer.phoneNumber && referrer.phoneNumber && newCustomer.phoneNumber === referrer.phoneNumber)
      ) {
        return { status: false, message: "Tidak bisa menggunakan kode referral dari akun yang terhubung" };
      }

      await newCustomer.update({ referredBy: referrer.id });

      return {
        status: true,
        message: "Referral berhasil diterapkan",
        data: { referrerId: referrer.id },
      };
    } catch (error) {
      console.error("[Referral] applyReferral error:", error.message);
      return { status: false, message: error.message };
    }
  },

  /**
   * Credit referral points after a successful payment.
   * Called from handleXenditCallback after order status becomes PAID.
   *
   * Logic:
   * - Find customer from order → check if they have referredBy
   * - If first completed order by this customer → 3% commission
   * - If subsequent → 1% commission
   * - Credit points to referrer's balance
   * - Send push notification to referrer
   */
  async creditReferralPoints(orderId, externalTransaction = null) {
    try {
      const orderData = await order.findByPk(orderId, {
        include: [{ model: transaction, as: "transactions" }],
      });

      if (!orderData) {
        console.log("[Referral] Order not found:", orderId);
        return;
      }

      const customer = await masterCustomer.findByPk(orderData.customerId);
      if (!customer || !customer.referredBy) {
        // Customer has no referrer, skip
        return;
      }

      const referrerId = customer.referredBy;

      // Check if referrer still exists and is active
      const referrer = await masterCustomer.findByPk(referrerId);
      if (!referrer) {
        console.log("[Referral] Referrer not found:", referrerId);
        return;
      }

      // Prevent duplicate: check if we already credited for this order
      const existingCredit = await referralPoints.findOne({
        where: { orderId, referrerId },
      });
      if (existingCredit) {
        console.log("[Referral] Points already credited for order:", orderId);
        return;
      }

      // Determine if this is the customer's first paid order
      const previousPaidOrders = await order.count({
        where: {
          customerId: customer.id,
          paymentStatus: "PAID",
          id: { [Op.ne]: orderId }, // exclude current order
        },
      });

      const isFirstTransaction = previousPaidOrders === 0;
      const commissionRate = isFirstTransaction
        ? FIRST_TRANSACTION_RATE
        : SUBSEQUENT_TRANSACTION_RATE;

      // Calculate total transaction amount (sum of all transactions in this order)
      const totalAmount = orderData.transactions.reduce(
        (sum, trx) => sum + parseFloat(trx.grandTotal || 0),
        0
      );

      if (totalAmount <= 0) {
        console.log("[Referral] Order total is 0, skipping:", orderId);
        return;
      }

      const pointsEarned = Math.floor((totalAmount * commissionRate) / 100);

      if (pointsEarned <= 0) return;

      const t = externalTransaction || (await sequelize.transaction());

      try {
        // Create referral points record
        await referralPoints.create(
          {
            referrerId,
            referredCustomerId: customer.id,
            orderId,
            transactionId: orderData.transactions.length > 0 ? orderData.transactions[0].id : null,
            transactionAmount: totalAmount,
            commissionRate,
            pointsEarned,
            isFirstTransaction,
            status: "CREDITED",
          },
          { transaction: t }
        );

        // Update or create referrer's balance
        let balance = await referralBalance.findOne({
          where: { customerId: referrerId },
          transaction: t,
          lock: true,
        });

        if (!balance) {
          balance = await referralBalance.create(
            {
              customerId: referrerId,
              balance: pointsEarned,
              totalEarned: pointsEarned,
              totalWithdrawn: 0,
            },
            { transaction: t }
          );
        } else {
          await balance.update(
            {
              balance: parseFloat(balance.balance) + pointsEarned,
              totalEarned: parseFloat(balance.totalEarned) + pointsEarned,
            },
            { transaction: t }
          );
        }

        if (!externalTransaction) await t.commit();

        // Send push notification to referrer (non-blocking)
        try {
          const formattedAmount = new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
          }).format(pointsEarned);

          await pushNotificationService.sendPushNotification(
            referrerId,
            "customer",
            {
              title: "Poin Referral Masuk! 🎉",
              body: `Anda mendapat ${formattedAmount} poin referral dari transaksi ${customer.name || "teman Anda"}.`,
              data: {
                type: "referral_point",
                pointsEarned: pointsEarned.toString(),
                orderId: orderId,
              },
            }
          );
        } catch (notifErr) {
          console.error("[Referral] Push notification error:", notifErr.message);
        }

        console.log(
          `[Referral] Credited ${pointsEarned} points to referrer ${referrerId} (${commissionRate}% of ${totalAmount}) for order ${orderId}`
        );
      } catch (innerErr) {
        if (!externalTransaction && t) await t.rollback();
        throw innerErr;
      }
    } catch (error) {
      console.error("[Referral] creditReferralPoints error:", error.message);
      // Non-blocking: don't throw, just log
    }
  },

  /**
   * Get points balance for a customer.
   */
  async getPointsBalance(customerId) {
    try {
      let balance = await referralBalance.findOne({
        where: { customerId },
      });

      if (!balance) {
        balance = await referralBalance.create({
          customerId,
          balance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
        });
      }

      return {
        status: true,
        message: "Success",
        data: {
          balance: parseFloat(balance.balance),
          totalEarned: parseFloat(balance.totalEarned),
          totalWithdrawn: parseFloat(balance.totalWithdrawn),
        },
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Get points earning history for a customer.
   */
  async getPointsHistory(customerId, pagination = {}) {
    try {
      const { limit = 20, offset = 0 } = pagination;

      const { count, rows } = await referralPoints.findAndCountAll({
        where: { referrerId: customerId },
        include: [
          {
            model: masterCustomer,
            as: "referredCustomer",
            attributes: ["id", "name", "username", "profileImageUrl"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return {
        status: true,
        message: "Success",
        data: rows.map((row) => ({
          id: row.id,
          referredCustomer: row.referredCustomer
            ? {
                id: row.referredCustomer.id,
                name: row.referredCustomer.name,
                username: row.referredCustomer.username,
                profileImageUrl: row.referredCustomer.profileImageUrl,
              }
            : null,
          transactionAmount: parseFloat(row.transactionAmount),
          commissionRate: parseFloat(row.commissionRate),
          pointsEarned: parseFloat(row.pointsEarned),
          isFirstTransaction: row.isFirstTransaction,
          status: row.status,
          createdAt: row.createdAt,
        })),
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Customer requests a withdrawal.
   * Minimum: Rp 100.000
   */
  async requestWithdrawal(customerId, data) {
    const t = await sequelize.transaction();
    try {
      const { amount, bankName, accountNumber, accountName } = data;

      if (!amount || !bankName || !accountNumber || !accountName) {
        return { status: false, message: "Data tidak lengkap. Isi amount, bankName, accountNumber, dan accountName." };
      }

      const withdrawAmount = parseFloat(amount);

      if (withdrawAmount < MIN_WITHDRAWAL_AMOUNT) {
        return {
          status: false,
          message: `Minimal penarikan adalah ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(MIN_WITHDRAWAL_AMOUNT)}`,
        };
      }

      // Check for pending withdrawals
      const pendingWithdrawal = await referralWithdrawal.findOne({
        where: { customerId, status: "PENDING" },
      });

      if (pendingWithdrawal) {
        return { status: false, message: "Anda masih memiliki permintaan penarikan yang sedang diproses" };
      }

      // Check balance
      let balance = await referralBalance.findOne({
        where: { customerId },
        transaction: t,
        lock: true,
      });

      if (!balance || parseFloat(balance.balance) < withdrawAmount) {
        if (t) await t.rollback();
        return { status: false, message: "Saldo poin tidak mencukupi" };
      }

      // Deduct balance immediately to prevent double-withdrawal
      await balance.update(
        {
          balance: parseFloat(balance.balance) - withdrawAmount,
          totalWithdrawn: parseFloat(balance.totalWithdrawn) + withdrawAmount,
        },
        { transaction: t }
      );

      // Create withdrawal record
      const withdrawal = await referralWithdrawal.create(
        {
          customerId,
          amount: withdrawAmount,
          bankName,
          accountNumber,
          accountName,
          status: "PENDING",
        },
        { transaction: t }
      );

      await t.commit();

      return {
        status: true,
        message: "Permintaan penarikan berhasil dibuat",
        data: {
          id: withdrawal.id,
          amount: parseFloat(withdrawal.amount),
          bankName: withdrawal.bankName,
          accountNumber: withdrawal.accountNumber,
          accountName: withdrawal.accountName,
          status: withdrawal.status,
          createdAt: withdrawal.createdAt,
        },
      };
    } catch (error) {
      if (t) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  /**
   * Get customer's own withdrawal history.
   */
  async getMyWithdrawals(customerId, pagination = {}) {
    try {
      const { limit = 20, offset = 0 } = pagination;

      const { count, rows } = await referralWithdrawal.findAndCountAll({
        where: { customerId },
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return {
        status: true,
        message: "Success",
        data: rows,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Admin: Get all withdrawal requests with filters.
   */
  async getWithdrawals(filters = {}, pagination = {}) {
    try {
      const { limit = 20, offset = 0 } = pagination;
      const where = {};

      if (filters.status) {
        where.status = filters.status;
      }

      const { count, rows } = await referralWithdrawal.findAndCountAll({
        where,
        include: [
          {
            model: masterCustomer,
            as: "customer",
            attributes: ["id", "name", "email", "phoneNumber", "profileImageUrl"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return {
        status: true,
        message: "Success",
        data: rows,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Admin: Process a withdrawal request (approve/reject).
   * If rejected, refund the balance back to the customer.
   */
  async processWithdrawal(withdrawalId, adminId, action, note = null) {
    const t = await sequelize.transaction();
    try {
      const withdrawal = await referralWithdrawal.findByPk(withdrawalId, {
        transaction: t,
        lock: true,
      });

      if (!withdrawal) {
        if (t) await t.rollback();
        return { status: false, message: "Withdrawal tidak ditemukan" };
      }

      if (withdrawal.status !== "PENDING") {
        if (t) await t.rollback();
        return { status: false, message: `Withdrawal sudah dalam status ${withdrawal.status}` };
      }

      if (action === "APPROVE" || action === "COMPLETED") {
        await withdrawal.update(
          {
            status: "COMPLETED",
            adminNote: note,
            processedAt: new Date(),
            processedBy: adminId,
          },
          { transaction: t }
        );
      } else if (action === "REJECT") {
        // Refund balance
        const balance = await referralBalance.findOne({
          where: { customerId: withdrawal.customerId },
          transaction: t,
          lock: true,
        });

        if (balance) {
          await balance.update(
            {
              balance: parseFloat(balance.balance) + parseFloat(withdrawal.amount),
              totalWithdrawn: parseFloat(balance.totalWithdrawn) - parseFloat(withdrawal.amount),
            },
            { transaction: t }
          );
        }

        await withdrawal.update(
          {
            status: "REJECTED",
            adminNote: note,
            processedAt: new Date(),
            processedBy: adminId,
          },
          { transaction: t }
        );
      } else {
        if (t) await t.rollback();
        return { status: false, message: "Action tidak valid. Gunakan APPROVE atau REJECT." };
      }

      await t.commit();

      // Notify customer
      try {
        const statusText = action === "REJECT" ? "ditolak" : "disetujui";
        const formattedAmount = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(withdrawal.amount);

        await pushNotificationService.sendPushNotification(
          withdrawal.customerId,
          "customer",
          {
            title: action === "REJECT" ? "Penarikan Ditolak ❌" : "Penarikan Diproses ✅",
            body: `Penarikan ${formattedAmount} telah ${statusText}.${note ? ` Catatan: ${note}` : ""}`,
            data: {
              type: "referral_withdrawal",
              withdrawalId: withdrawal.id,
              status: withdrawal.status,
            },
          }
        );
      } catch (notifErr) {
        console.error("[Referral] Withdrawal notification error:", notifErr.message);
      }

      return {
        status: true,
        message: `Withdrawal berhasil di-${action === "REJECT" ? "reject" : "approve"}`,
        data: withdrawal,
      };
    } catch (error) {
      if (t) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  /**
   * Admin: Get referral statistics overview.
   */
  async getReferralStats() {
    try {
      // Total customers with referral code
      const totalReferrers = await masterCustomer.count({
        where: { referralCode: { [Op.ne]: null } },
      });

      // Total referred customers
      const totalReferred = await masterCustomer.count({
        where: { referredBy: { [Op.ne]: null } },
      });

      // Total points credited
      const totalPointsCredited = await referralPoints.sum("pointsEarned", {
        where: { status: "CREDITED" },
      });

      // Total withdrawals completed
      const totalWithdrawalsCompleted = await referralWithdrawal.sum("amount", {
        where: { status: "COMPLETED" },
      });

      // Pending withdrawals
      const pendingWithdrawals = await referralWithdrawal.count({
        where: { status: "PENDING" },
      });

      const pendingWithdrawalAmount = await referralWithdrawal.sum("amount", {
        where: { status: "PENDING" },
      });

      // Top referrers
      const topReferrers = await referralBalance.findAll({
        where: { totalEarned: { [Op.gt]: 0 } },
        include: [
          {
            model: masterCustomer,
            as: "customer",
            attributes: ["id", "name", "username", "profileImageUrl"],
          },
        ],
        order: [["totalEarned", "DESC"]],
        limit: 10,
      });

      return {
        status: true,
        message: "Success",
        data: {
          totalReferrers,
          totalReferred,
          totalPointsCredited: parseFloat(totalPointsCredited || 0),
          totalWithdrawalsCompleted: parseFloat(totalWithdrawalsCompleted || 0),
          pendingWithdrawals,
          pendingWithdrawalAmount: parseFloat(pendingWithdrawalAmount || 0),
          topReferrers: topReferrers.map((r) => ({
            customer: r.customer
              ? {
                  id: r.customer.id,
                  name: r.customer.name,
                  username: r.customer.username,
                  profileImageUrl: r.customer.profileImageUrl,
                }
              : null,
            balance: parseFloat(r.balance),
            totalEarned: parseFloat(r.totalEarned),
            totalWithdrawn: parseFloat(r.totalWithdrawn),
          })),
        },
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Get list of referred customers for a referrer.
   */
  async getReferredCustomers(customerId, pagination = {}) {
    try {
      const { limit = 20, offset = 0 } = pagination;

      const { count, rows } = await masterCustomer.findAndCountAll({
        where: { referredBy: customerId },
        attributes: ["id", "name", "username", "profileImageUrl", "createdAt"],
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return {
        status: true,
        message: "Success",
        data: rows,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
};
