const response = require("../helpers/response");
const flashSaleService = require("../services/flashSale.service");

module.exports = {
  async create(req, res) {
    try {
      const data = req.body;
      const result = await flashSaleService.create(data);
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getByLocationId(req, res) {
    try {
      const { locationId } = req.params;
      const { status } = req.query;
      const result = await flashSaleService.getByLocationId(locationId, status);
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

  async getActive(req, res) {
    try {
      const { cityId } = req.query;
      const result = await flashSaleService.getActive({ cityId });
      if (!result.status) return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      const result = await flashSaleService.update(id, data);
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
};
