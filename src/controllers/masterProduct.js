const response = require("../helpers/response");
const productService = require("../services/masterProduct");
const { getPagination, formatPagination } = require("../utils/pagination");

module.exports = {
  async getAll(req, res) {
    try {
      const {
        name,
        minPrice,
        maxPrice,
        categoryIds,
        lat,
        lng,
        maxDistance,
        sort,
        customerId,
        isCustomer,
        cityId,
        consultationCategoryIds
      } = req.query;

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

      const { page, pageSize } = req.query;
      const pagination = getPagination(page, pageSize);

      const result = await productService.getAll({
        name: name || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        categoryIds: categoryIdsArray,
        userLat: lat ? parseFloat(lat) : undefined,
        userLng: lng ? parseFloat(lng) : undefined,
        maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
        sort: sort || undefined,
        customerId: customerId || undefined,
        isCustomer: isCustomer,
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
      const result = await productService.create(data, req.files, req.user.id);
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

  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await productService.deleteProduct(id);
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

  async getByCreator(req, res) {
    try {
      const userId = req.user.id;
      const result = await productService.getProductByCreator(userId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async toggleLocationActive(req, res) {
    try {
      const { productId, locationId } = req.params;
      const result = await productService.toggleLocationActive(productId, locationId);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
