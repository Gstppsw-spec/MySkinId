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

  async getAllUser(req, res) {
    try {
      const result = await authService.getAllUser();
      if (!result.status) {
        return response.error(res, result.message, result.data);
      }
      return response.success(res, result.message, result.data);
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
};
