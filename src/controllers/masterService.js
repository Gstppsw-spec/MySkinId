const response = require("../helpers/response");
const service = require("../services/masterService");

module.exports = {
  async getAll(req, res) {
    try {
      const { minPrice, maxPrice, categoryIds } = req.query;
      const categoryIdsArray = categoryIds
        ? Array.isArray(categoryIds)
          ? categoryIds
          : [categoryIds]
        : undefined;

      const result = await service.getAll({
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        categoryIds: categoryIdsArray,
      });

      res.json(result);
    } catch (error) {
      res
        .status(500)
        .json({ status: false, message: error.message, data: null });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await service.getById(id);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async create(req, res) {
    const data = req.body;
    const result = await service.create(data, req.file);
    return res.status(result.status ? 201 : 400).json(result);
  },

  async update(req, res) {
    const { id } = req.params;
    const result = await service.update(id, req.body, req.file);
    return res.status(result.status ? 200 : 400).json(result);
  },
};
