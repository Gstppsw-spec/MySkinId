const response = require("../helpers/response");
const masterCategoryService = require("../services/masterCategoryService");
// const masterCategoryService = require("../services/masterCategoryService");

module.exports = {
  async getAllMainServiceCategory(req, res) {
    try {
      const result = await masterCategoryService.getAllMainServiceCategory();
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getMainServiceCategoryById(req, res) {
    try {
      const { id } = req.params;
      const result = await masterCategoryService.getMainServiceCategoryById(id);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async createMainServiceCategory(req, res) {
    const data = req.body;
    const result = await masterCategoryService.createMainServiceCategory(data);
    return res.status(result.status ? 201 : 400).json(result);
  },

  async updateMainServiceCategory(req, res) {
    const { id } = req.params;
    const data = req.body;
    const result = await masterCategoryService.updateMainServiceCategory(
      id,
      data,
    );
    return res.status(result.status ? 200 : 400).json(result);
  },

  //sub category
  async getAllSubServiceCategory(req, res) {
    try {
      const result = await masterCategoryService.getAllSubServiceCategory();
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getSubServiceCategoryById(req, res) {
    try {
      const { id } = req.params;
      const result = await masterCategoryService.getSubServiceCategoryById(id);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async createSubServiceCategory(req, res) {
    const data = req.body;
    const result = await masterCategoryService.createSubServiceCategory(data);
    return res.status(result.status ? 201 : 400).json(result);
  },

  async updateSubServiceCategory(req, res) {
    const { id } = req.params;
    const data = req.body;
    const result = await masterCategoryService.updateSubServiceCategory(
      id,
      data,
    );
    return res.status(result.status ? 200 : 400).json(result);
  },
};
