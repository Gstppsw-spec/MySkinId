const response = require("../helpers/response");
const service = require("../services/masterService");
const { getPagination, formatPagination } = require("../utils/pagination");

module.exports = {
  async getAll(req, res) {
    try {
      const {
        name,
        minPrice,
        maxPrice,
        categoryIds,
        cityId,
        latt,
        long,
        maxDistance,
        sortBy,
        customerId,
        isCustomer,
      } = req.query;

      const { page, pageSize } = req.query;
      const pagination = getPagination(page, pageSize);

      const categoryIdsArray = categoryIds
        ? Array.isArray(categoryIds)
          ? categoryIds
          : categoryIds.toString().split(",")
        : undefined;

      const result = await service.getAll({
        name: name || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        categoryIds: categoryIdsArray,
        cityId: cityId || undefined,
        userLat: latt ? parseFloat(latt) : undefined,
        userLng: long ? parseFloat(long) : undefined,
        maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
        sortBy: sortBy || undefined,
        customerId: customerId || undefined,
        isCustomer: isCustomer,
      }, pagination);

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

  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await service.deleteService(id);
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
        isCustomer,
      );
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getServiceByUser(req, res) {
    try {
      const user = req.user;
      const { name, page, pageSize, customerId, isCustomer, locationId } = req.query;
      const pagination = getPagination(page, pageSize);

      const result = await service.getServiceByUser(user, { name, customerId, isCustomer, locationId }, pagination);
      if (!result.status)
        return response.error(res, result.message, result.data);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        stats: result.stats,
        pagination: formatPagination(result.totalCount, page, pageSize),
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async toggleLocationActive(req, res) {
    try {
      const { serviceId, locationId } = req.params;
      const result = await service.toggleLocationActive(serviceId, locationId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
