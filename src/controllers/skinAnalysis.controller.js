const skinAnalysisService = require("../services/skinAnalysis.service");
const response = require("../helpers/response");

module.exports = {
  async analyzeSkin(req, res) {
    try {
      const { customerId } = req.body;
      const imageFile = req.file;

      if (!customerId || !imageFile) {
        return res.status(400).json({
          success: false,
          message: "customerId and image are required",
        });
      }

      const result = await skinAnalysisService.analyze({
        customerId,
        imageFile,
      });

      if (!result.status) return response.error(res, result.message, null);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  async getLatestAnalysis(req, res) {
    try {
      const { customerId } = req.params;
      const result = await skinAnalysisService.getLatest(customerId);
      if (!result.status) return response.error(res, result.message, null);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
