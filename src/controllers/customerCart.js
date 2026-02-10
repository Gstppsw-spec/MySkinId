const response = require("../helpers/response");
const customerCart = require("../services/customerCart");

module.exports = {
  async getCustomerCart(req, res) {
    try {
      const userId = req.user.id;
      const result = await customerCart.getCustomerCart(userId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async createCustomerCart(req, res) {
    const userId = req.user.id;
    try {
      const result = await customerCart.createCustomerCart(req.body, userId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async deleteCustomerCart(req, res) {
    try {
      const { cartId } = req.params;
      const result = await customerCart.deleteCustomerCart(cartId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async clearCartByRefferenceType(req, res) {
    const userId = req.user.id;
    try {
      const { refferenceType } = req.body;
      const result = await customerCart.clearCartByRefferenceType(
        userId,
        refferenceType
      );
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async addQtyCustomerCart(req, res) {
    const userId = req.user.id;
    const { refferenceId } = req.body;
    try {
      const result = await customerCart.addQtyCustomerCart(refferenceId, userId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async reduceQtyCustomerCart(req, res) {
    const userId = req.user.id;
    const { refferenceId } = req.body;
    try {
      const result = await customerCart.reduceQtyCustomerCart(refferenceId, userId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async selectCustomerCart(req, res) {
    try {
      const { cartId } = req.params;
      const result = await customerCart.selectCustomerCart(cartId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async selectAllCustomerCartByRefferenceType(req, res) {
    const userId = req.user.id;
    const { refferenceType } = req.body;
    try {
      const result = await customerCart.selectAllCustomerCartByRefferenceType(userId, refferenceType);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
