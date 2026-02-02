const response = require("../helpers/response");
const ratingService = require("../services/customerRating");

module.exports = {
  async createOrUpdateRating(req, res) {
    try {
      const images = req.files || [];
      const result = await ratingService.createOrUpdateRating(req.body, images);
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
  async deleteImage(req, res) {
    const { id } = req.params;
    const result = await ratingService.deleteImage(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getByEntity(req, res) {
    try {
      const { entityId } = req.params;
      const { entityType } = req.query;
      
      const result = await ratingService.getByEntity(
        entityType.toUpperCase(),
        entityId
      );

      if (!result.status) {
        return response.error(res, result.message, result.data);
      }

      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
