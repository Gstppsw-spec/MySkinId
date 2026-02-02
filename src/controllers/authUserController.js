const authService = require("../services/authUserService");
const response = require("../helpers/response");

module.exports = {
  async register(req, res) {
    try {
      const result = await authService.register(req.body);

      if (!result.status) {
        return response.error(res, result.message, result.data);
      }

      return response.success(res, result.message, result.data);
    } catch (err) {
      return response.serverError(res, err);
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      if (!result.status) {
        return response.error(res, result.message, result.data);
      }

      return response.success(res, result.message, result.data);
    } catch (err) {
      return response.serverError(res, err);
    }
  },

  async createUser(req, res) {
    try {
      const result = await authService.createUser(req.body);
      if (!result.status) {
        return response.error(res, result.message, result.data);
      }
      return response.success(res, result.message, result.data);
    } catch (err) {
      return response.serverError(res, err);
    }
  },

  async getUserByCompanyId(req, res) {
    try {
      const { companyId } = req.params;
      const result = await authService.getUserByCompanyId(companyId);
      if (!result.status) {
        return response.error(res, result.message, result.data);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, err);
    }
  },
};
