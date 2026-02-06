const response = require("../helpers/response");
const ratingService = require("../services/customerRating");

module.exports = {
  async createOrUpdateRating(req, res) {
    try {
      const images = req.files || [];
      const customerId = req.user.id;
      const result = await ratingService.createOrUpdateRating(customerId, req.body, images);
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
      const { entityType, rating } = req.query;

      const currentUserId = req.user ? req.user.id : null;
      const result = await ratingService.getByEntity(
        entityType.toUpperCase(),
        entityId,
        currentUserId,
        rating
      );

      if (!result.status) {
        return response.error(res, result.message, result.data);
      }

      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
  async deleteRating(req, res) {
    const { id } = req.params;
    const result = await ratingService.deleteRating(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async toggleLike(req, res) {
    try {
      const { ratingId } = req.params;
      const customerId = req.user.id; // From verifyToken

      const result = await ratingService.toggleLike(ratingId, customerId);

      if (!result.status) {
        return response.error(res, result.message, result.data);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
