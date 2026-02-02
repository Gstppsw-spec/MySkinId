const response = require("../helpers/response");
const packageService = require("../services/masterPackage");

module.exports = {
  async getAllPackage(req, res) {
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

      const result = await packageService.getAllPackage({
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        userLat: lat ? parseFloat(lat) : undefined,
        userLng: lng ? parseFloat(lng) : undefined,
        maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
        sort: sort || undefined,
        customerId: customerId || undefined,
        isCustomer: isCustomer,
        categoryIds: categoryIdsArray,
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

      const result = await packageService.getById(
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
      const result = await packageService.create(data);

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
      const result = await packageService.update(id, data);
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

      const result = await packageService.getByLocationId(
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

  async getPackageByUser(req, res) {
    try {
      const user = req.user;
      const result = await packageService.getPackageByUser(user);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async createItemPackage(req, res) {
    try {
      const data = req.body;
      const result = await packageService.createItemPackage(data);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async updateItemPackage(req, res) {
    try {
      const { packageItemId } = req.params;
      const data = req.body;
      const result = await packageService.updateItemPackage(
        packageItemId,
        data,
      );
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async deletePackage(req, res) {
    try {
      const { packageId } = req.params;
      const result = await packageService.deletePackage(packageId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async deletePackageItem(req, res) {
    try {
      const { packageItemId } = req.params;
      const result = await packageService.deletePackageItem(packageItemId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
