const response = require("../helpers/response");
const productCategoryService = require("../services/masterProductCategory");

module.exports = {
  async getAll(req, res) {
    try {
      const result = await productCategoryService.getAll();
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
      const result = await productCategoryService.getById(id);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async create(req, res) {
    const data = req.body;
    const result = await productCategoryService.create(data);
    return res.status(result.status ? 201 : 400).json(result);
  },

  async update(req, res) {
    
    
    const { id } = req.params;
    const data = req.body; // { name, description, isActive }

    console.log(data, id);

    const result = await productCategoryService.update(id, data);
    return res.status(result.status ? 200 : 400).json(result);
  },
};
