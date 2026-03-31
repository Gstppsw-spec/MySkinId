const authService = require("../services/authUserService");
const response = require("../helpers/response");
const { getPagination, formatPagination } = require("../utils/pagination");

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

  async getAllUser(req, res) {
    try {
      const { page, pageSize, name } = req.query;
      const pagination = getPagination(page, pageSize);

      const result = await authService.getAllUser(pagination, name);
      if (!result.status) {
        return response.error(res, result.message, result.data);
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        pagination: formatPagination(result.totalCount, page, pageSize),
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getAllUserCompany(req, res) {
    try {
      const { page, pageSize, name } = req.query;
      const pagination = getPagination(page, pageSize);

      const result = await authService.getAllUserCompany(pagination, name);
      if (!result.status) {
        return response.error(res, result.message, result.data);
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        pagination: formatPagination(result.totalCount, page, pageSize),
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const result = await authService.getUserById(id);
      if (!result.status) {
        return response.error(res, result.message, result.data);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async editUser(req, res) {
    try {
      const { id } = req.params;
      const result = await authService.updateUser(id, req.body);
      if (!result.status) {
        return response.error(res, result.message, result.data);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const result = await authService.deleteUser(id);
      if (!result.status) {
        return response.error(res, result.message, result.data);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const result = await authService.resetPassword(id);
      if (!result.status) {
        return response.error(res, result.message, result.data);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async toggleAvailableConsul(req, res) {
    try {
      const { userId } = req.user;
      const { isAvailableConsul } = req.body;

      if (typeof isAvailableConsul !== "boolean") {
        return response.error(res, "isAvailableConsul harus berupa boolean", null);
      }

      const result = await authService.toggleAvailableConsul(userId, isAvailableConsul);
      if (!result.status) {
        return response.error(res, result.message, result.data);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
