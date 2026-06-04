const response = require("../helpers/response");
const flashSaleService = require("../services/flashSale.service");
const { getPagination, formatPagination } = require("../utils/pagination");

module.exports = {
  // ── Super Admin ─────────────────────────────

  async create(req, res) {
    try {
      console.log(req.body);
      const result = await flashSaleService.create(req.body);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getAll(req, res) {
    try {
      const { status, page, pageSize, name } = req.query;
      const pagination = getPagination(page, pageSize);

      const result = await flashSaleService.getAll(status, pagination, name);

      if (!result.status) return response.error(res, result.message, result.data);

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
      const result = await flashSaleService.getById(id);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const result = await flashSaleService.update(id, req.body);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await flashSaleService.delete(id);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  // ── Outlet Admin ────────────────────────────

  async registerItems(req, res) {
    try {
      const { id } = req.params;
      const result = await flashSaleService.registerItems(id, req.body, req.user);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getItemsByLocation(req, res) {
    try {
      const { id, locationId } = req.params;
      const result = await flashSaleService.getItemsByLocation(id, locationId);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async removeItem(req, res) {
    try {
      const { itemId } = req.params;
      const result = await flashSaleService.removeItem(itemId);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async removeItems(req, res) {
    try {
      const { itemIds } = req.body;
      const result = await flashSaleService.removeItems(itemIds);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async sendFlashSaleNotification(req, res) {
    try {
      const { id } = req.params;
      const { target, title, body } = req.body;
      const result = await flashSaleService.sendFlashSaleNotification(id, { target, title, body });
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async sendFlashSaleCustomerNotification(req, res) {
    try {
      const { id } = req.params;
      const { target, title, body } = req.body;
      const result = await flashSaleService.sendFlashSaleCustomerNotification(id, { target, title, body });
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  // ── Customer ────────────────────────────────

  async getActive(req, res) {
    try {
      const { latt, long } = req.query;
      const userLat = latt ? parseFloat(latt) : undefined;
      const userLng = long ? parseFloat(long) : undefined;
      const result = await flashSaleService.getActive(userLat, userLng);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
