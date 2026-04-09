const pushNotificationService = require("../services/pushNotification.service");
const response = require("../helpers/response");

module.exports = {
  /**
   * POST /api/v2/push-token
   * Body: { token, deviceId? }
   * Auth: verifyToken (both customer & user/doctor)
   *
   * Determines caller type by checking req.user.roleCode:
   *   - If roleCode exists → user (doctor/outlet)  → saves as userId
   *   - If roleCode absent → customer               → saves as customerId
   */
  async registerToken(req, res) {
    try {
      const { token, deviceId } = req.body;

      // Distinguish between customer and user (doctor/outlet)
      // Customer JWT: { id }   |   User JWT: { id, roleId, roleCode }
      const isUser = !!req.user.roleCode;

      const result = await pushNotificationService.registerToken({
        token,
        customerId: isUser ? null : req.user.id,
        userId: isUser ? req.user.id : null,
        deviceId,
      });

      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message, null);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /**
   * DELETE /api/v2/push-token
   * Body: { token }
   */
  async removeToken(req, res) {
    try {
      const { token } = req.body;

      const result = await pushNotificationService.removeToken(token);

      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message, null);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};
