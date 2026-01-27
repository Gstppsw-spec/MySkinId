const response = require("../helpers/response");
const favorites = require("../services/customerFavorites");

module.exports = {
  async getCustomerFavorites(req, res) {
    try {
      const { customerId } = req.params;
      const result = await favorites.getCustomerFavorites(customerId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async updateCustomerFavorites(req, res) {
    try {
      console.log(req.body);
      
      const result = await favorites.updateCustomerFavorites(req.body);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
