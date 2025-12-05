const response = require("../helpers/response");
const productService = require("../services/masterProduct");

module.exports = {
  async getAll(req, res) {
    try {
      const { minPrice, maxPrice, categoryIds } = req.query;
      const categoryIdsArray = categoryIds
        ? Array.isArray(categoryIds)
          ? categoryIds
          : [categoryIds]
        : undefined;

      const result = await productService.getAll({
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
      const result = await productService.getById(id);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async create(req, res) {
    const data = req.body;
    const result = await productService.create(data, req.files);
    return res.status(result.status ? 201 : 400).json(result);
  },

  async update(req, res) {
    const { id } = req.params;
    const data = req.body;
    const result = await productService.update(id, data, req.files);
    return res.status(result.status ? 200 : 400).json(result);
  },

  async deleteImage(req, res) {
    const { id } = req.params;

    const result = await productService.deleteImage(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },
};
