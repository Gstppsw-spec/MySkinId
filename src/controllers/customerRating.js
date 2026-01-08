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
};
