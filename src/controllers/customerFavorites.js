const response = require("../helpers/response");
const favorites = require("../services/customerFavorites");
const { getPagination, formatPagination } = require("../utils/pagination");

module.exports = {
  async getCustomerFavorites(req, res) {
    try {
      const customerId = req.user.id;
      const { latt, long, type, page, pageSize } = req.query;

      const result = await favorites.getCustomerFavorites(
        customerId,
        latt,
        long,
        type,
        page,
        pageSize
      );
      if (!result.status)
        return response.error(res, result.message, result.data);

      if (type) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
          pagination: formatPagination(result.totalCount, page, pageSize),
        });
      }

      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async updateCustomerFavorites(req, res) {
    try {
      const customerId = req.user.id;
      const result = await favorites.updateCustomerFavorites({
        ...req.body,
        customerId,
      });
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
