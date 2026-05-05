const referralService = require("../services/referral.service");
const response = require("../helpers/response");

class referralController {
  /**
   * GET /api/v2/referral/info
   * Get customer's referral info (code, link, stats, balance)
   */
  async getReferralInfo(req, res) {
    try {
      const customerId = req.user.id;
      const result = await referralService.getReferralInfo(customerId);
      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message);
    } catch (err) {
      return response.serverError(res, err);
    }
  }

  /**
   * GET /api/v2/referral/points
   * Get customer's points balance
   */
  async getPointsBalance(req, res) {
    try {
      const customerId = req.user.id;
      const result = await referralService.getPointsBalance(customerId);
      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message);
    } catch (err) {
      return response.serverError(res, err);
    }
  }

  /**
   * GET /api/v2/referral/points/history
   * Get customer's points earning history
   */
  async getPointsHistory(req, res) {
    try {
      const customerId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await referralService.getPointsHistory(customerId, {
        limit,
        offset,
      });
      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message);
    } catch (err) {
      return response.serverError(res, err);
    }
  }

  /**
   * GET /api/v2/referral/referred-customers
   * Get list of customers referred by this customer
   */
  async getReferredCustomers(req, res) {
    try {
      const customerId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await referralService.getReferredCustomers(customerId, {
        limit,
        offset,
      });
      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message);
    } catch (err) {
      return response.serverError(res, err);
    }
  }

  /**
   * POST /api/v2/referral/withdraw
   * Request a withdrawal of referral points
   * Body: { amount, bankName, accountNumber, accountName }
   */
  async requestWithdrawal(req, res) {
    try {
      const customerId = req.user.id;
      const result = await referralService.requestWithdrawal(
        customerId,
        req.body
      );
      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message);
    } catch (err) {
      return response.serverError(res, err);
    }
  }

  /**
   * GET /api/v2/referral/withdrawals
   * Get customer's own withdrawal history
   */
  async getMyWithdrawals(req, res) {
    try {
      const customerId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await referralService.getMyWithdrawals(customerId, {
        limit,
        offset,
      });
      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message);
    } catch (err) {
      return response.serverError(res, err);
    }
  }

  /**
   * GET /api/v2/referral/admin/withdrawals
   * Admin: Get all withdrawal requests
   */
  async adminGetWithdrawals(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await referralService.getWithdrawals(
        { status },
        { limit, offset }
      );
      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message);
    } catch (err) {
      return response.serverError(res, err);
    }
  }

  /**
   * PUT /api/v2/referral/admin/withdrawals/:id
   * Admin: Process a withdrawal (approve/reject)
   * Body: { action: "APPROVE" | "REJECT", note?: string }
   */
  async adminProcessWithdrawal(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const { action, note } = req.body;

      if (!action || !["APPROVE", "REJECT"].includes(action.toUpperCase())) {
        return response.error(
          res,
          "Action harus APPROVE atau REJECT"
        );
      }

      const result = await referralService.processWithdrawal(
        id,
        adminId,
        action.toUpperCase(),
        note
      );
      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message);
    } catch (err) {
      return response.serverError(res, err);
    }
  }

  /**
   * GET /api/v2/referral/admin/stats
   * Admin: Get referral statistics overview
   */
  async adminGetReferralStats(req, res) {
    try {
      const result = await referralService.getReferralStats();
      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message);
    } catch (err) {
      return response.serverError(res, err);
    }
  }
}

module.exports = new referralController();
