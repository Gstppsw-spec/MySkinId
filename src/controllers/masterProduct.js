const response = require("../helpers/response");
const productService = require("../services/masterProduct");

module.exports = {
  async getAll(req, res) {
    try {
      const {
        minPrice,
        maxPrice,
        categoryIds,
        lat,
        lng,
        maxDistance,
        sort,
        customerId,
        isCustomer,
      } = req.query;

      const categoryIdsArray = categoryIds
        ? Array.isArray(categoryIds)
          ? categoryIds
          : [categoryIds]
        : undefined;

      const result = await productService.getAll({
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        categoryIds: categoryIdsArray,
        userLat: lat ? parseFloat(lat) : undefined,
        userLng: lng ? parseFloat(lng) : undefined,
        maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
        sort: sort || undefined,
        customerId: customerId || undefined,
        isCustomer: isCustomer,
      });

      if (!result.status) {
        return response.error(res, result.message, result.data);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
        data: null,
      });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const { customerId, lat, lng } = req.query;
      const userLat = lat ? parseFloat(lat) : undefined;
      const userLng = lng ? parseFloat(lng) : undefined;

      const result = await productService.getById(
        id,
        customerId,
        userLat,
        userLng,
      );
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async create(req, res) {
    try {
      const data = req.body;
      const result = await productService.create(data, req.files);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      const result = await productService.update(id, data, req.files);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async deleteImage(req, res) {
    const { id } = req.params;
    const result = await productService.deleteImage(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getByLocationId(req, res) {
    try {
      const { locationId } = req.params;
      const { customerId, isCustomer } = req.query;
      const result = await productService.getByLocationId(
        customerId,
        locationId,
        isCustomer,
      );
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
  async getProductByUser(req, res) {
    try {
      const user = req.user;
      const result = await productService.getProductByUser(user);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
