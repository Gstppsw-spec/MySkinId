const response = require("../helpers/response");
const service = require("../services/masterService");

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

      const result = await service.getAll({
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
      return response.serverError(res, error);
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const { customerId, lat, lng } = req.query;

      const userLat = lat ? parseFloat(lat) : undefined;
      const userLng = lng ? parseFloat(lng) : undefined;

      const result = await service.getById(id, customerId, userLat, userLng);
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
      const result = await service.create(data, req.file);
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
      const result = await service.update(id, req.body, req.file);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getByLocationId(req, res) {
    try {
      const { locationId } = req.params;
      const { customerId, isCustomer } = req.query;
      const result = await service.getByLocationId(
        locationId,
        customerId,
        isCustomer
      );
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
