const response = require("../helpers/response");
const orderCart = require("../services/orderCart");

module.exports = {
  async getCartProduct(req, res) {
    try {
      const { customerId } = req.params;
      const result = await orderCart.getCartProduct(customerId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async createCartProduct(req, res) {
    try {
      const result = await orderCart.createCartProduct(req.body);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async deleteCartProduct(req, res) {
    try {
      const { cartId } = req.params;
      const result = await orderCart.deleteCartProduct(cartId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async clearCartProduct(req, res) {
    try {
      const { customerId } = req.params;
      const result = await orderCart.clearCartProduct(customerId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async addQtyCartProduct(req, res) {
    try {
      const result = await orderCart.addQtyCartProduct(req.body);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async reduceQtyCartProduct(req, res) {
    try {
      const result = await orderCart.reduceQtyCartProduct(req.body);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async selectCartProduct(req, res) {
    try {
      const { cartId } = req.params;
      const result = await orderCart.selectCartProduct(cartId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async selectAllCartProduct(req, res) {
    try {
      const { customerId } = req.params;
      const result = await orderCart.selectAllCartProduct(customerId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  

  async getCartService(req, res) {
    try {
      const { customerId } = req.params;
      const result = await orderCart.getCartService(customerId);
      if (!result.status)
        return response.error(res, result.message, null);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async createCartService(req, res) {
    try {
      const result = await orderCart.createCartService(req.body);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async deleteCartService(req, res) {
    try {
      const { cartId } = req.params;
      const result = await orderCart.deleteCartService(cartId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async clearCartService(req, res) {
    try {
      const { customerId } = req.params;
      const result = await orderCart.clearCartService(customerId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async reduceQtyCartService(req, res) {
    try {
      const result = await orderCart.reduceQtyCartService(req.body);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async addQtyCartService(req, res) {
    try {
      const result = await orderCart.addQtyCartService(req.body);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async selectCartService(req, res) {
    try {
      const { cartId } = req.params;
      const result = await orderCart.selectCartService(cartId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async selectAllCartService(req, res) {
    try {
      const { customerId } = req.params;
      const result = await orderCart.selectAllCartService(customerId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

};
