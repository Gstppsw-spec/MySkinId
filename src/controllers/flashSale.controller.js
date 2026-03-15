const response = require("../helpers/response");
const flashSaleService = require("../services/flashSale.service");

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
      const { status } = req.query;
      const result = await flashSaleService.getAll(status);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
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
      const result = await flashSaleService.registerItems(id, req.body);
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

  // ── Customer ────────────────────────────────

  async getActive(req, res) {
    try {
      const result = await flashSaleService.getActive();
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
