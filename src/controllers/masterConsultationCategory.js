const response = require("../helpers/response");
const consultationCategoryService = require("../services/masterConsultationCategory");

module.exports = {
  async getAll(req, res) {
    try {
      const result = await consultationCategoryService.getAll();
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await consultationCategoryService.getById(id);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async create(req, res) {
    const data = req.body; // { name, description, iconUrl, isActive }
    const result = await consultationCategoryService.create(data);
    return res.status(result.status ? 201 : 400).json(result);
  },

  async update(req, res) {
    const { id } = req.params;
    const data = req.body; // { name, description, iconUrl, isActive }
    const result = await consultationCategoryService.update(id, data);
    return res.status(result.status ? 200 : 400).json(result);
  },
};
