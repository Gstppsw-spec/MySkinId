const response = require("../helpers/response");
const packageService = require("../services/masterPackage");
const { getPagination, formatPagination } = require("../utils/pagination");

module.exports = {
  async getAllPackage(req, res) {
    try {
      const {
        name,
        minPrice,
        maxPrice,
        categoryIds,
        latt,
        long,
        maxDistance,
        sortBy,
        customerId,
        isCustomer,
        cityId,
        consultationCategoryIds,
      } = req.query;

      const { page, pageSize } = req.query;
      const pagination = getPagination(page, pageSize);

      const categoryIdsArray = categoryIds
        ? Array.isArray(categoryIds)
          ? categoryIds
          : categoryIds.toString().split(",")
        : undefined;

      const consultationCategoryIdsArray = consultationCategoryIds
        ? Array.isArray(consultationCategoryIds)
          ? consultationCategoryIds
          : consultationCategoryIds.toString().split(",")
        : undefined;

      const result = await packageService.getAllPackage({
        name: name || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        userLat: latt ? parseFloat(latt) : undefined,
        userLng: long ? parseFloat(long) : undefined,
        maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
        sortBy: sortBy || undefined,
        customerId: customerId || undefined,
        isCustomer: isCustomer,
        categoryIds: categoryIdsArray,
        cityId: cityId || undefined,
        consultationCategoryIds: consultationCategoryIdsArray,
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
      const result = await packageService.create(data, req.user.id);

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
      const { name, page, pageSize } = req.query;
      const pagination = getPagination(page, pageSize);

      const result = await packageService.getPackageByUser(user, { name }, pagination);
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

  async getByCreator(req, res) {
    try {
      const userId = req.user.id;
      const result = await packageService.getPackageByCreator(userId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async toggleLocationActive(req, res) {
    try {
      const { packageId, locationId } = req.params;
      const result = await packageService.toggleLocationActive(packageId, locationId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
