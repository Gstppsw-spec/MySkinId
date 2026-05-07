const balanceService = require("../services/balance.service");

module.exports = {
  /**
   * Get balance info for the logged-in company
   */
  async getBalanceInfo(req, res) {
    try {
      let companyId = req.user.companyId;

      // Allow Super Admin or Operational Admin to view any company's balance
      if (["SUPER_ADMIN", "OPERATIONAL_ADMIN"].includes(req.user.roleCode) && req.query.companyId) {
        companyId = req.query.companyId;
      }

      if (!companyId) {
        return res.status(400).json({ status: false, message: "Company ID is required or user is not associated with a company" });
      }

      const result = await balanceService.getCompanyBalanceInfo(companyId);
      return res.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  /**
   * Get balance history for the logged-in company
   */
  async getHistory(req, res) {
    try {
      let companyId = req.user.companyId;
      const { page = 1, pageSize = 10 } = req.query;

      if (["SUPER_ADMIN", "OPERATIONAL_ADMIN"].includes(req.user.roleCode) && req.query.companyId) {
        companyId = req.query.companyId;
      }
      
      if (!companyId) {
        return res.status(400).json({ status: false, message: "Company ID is required" });
      }

      const result = await balanceService.getHistory(companyId, {
        limit: parseInt(pageSize),
        offset: (parseInt(page) - 1) * parseInt(pageSize)
      });
      
      return res.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  /**
   * Request withdrawal
   */
  async withdraw(req, res) {
    try {
      const companyId = req.user.companyId;
      const { amount } = req.body;

      if (!amount || amount < 10000) {
        return res.status(400).json({ status: false, message: "Minimum withdrawal is Rp10.000" });
      }

      const result = await balanceService.withdrawBalance(companyId, amount);
      return res.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }
};
