const masterCustomerService = require("../services/masterCustomer.service");
const response = require("../helpers/response");

class masterCustomerController {
  async registerCustomer(req, res) {
    const result = await masterCustomerService.registerCustomer(req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async verifyOTP(req, res) {
    const result = await masterCustomerService.verifyOtp(req.body);

    console.log(result);


    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async loginCustomer(req, res) {
    console.log(req.body);

    const result = await masterCustomerService.loginCustomer(req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async resendOtpAuthentication(req, res) {
    const result = await masterCustomerService.resendOtpAuthentication(req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async getCustomerByUsername(req, res) {
    const result = await masterCustomerService.getCustomerByUsername(
      req.query.username,
      req.user?.id
    );
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async getCustomerByUserId(req, res) {
    const result = await masterCustomerService.getCustomerByUserId(
      req.params.userId,
      req.user?.id
    );
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async updateProfile(req, res) {
    const customerId = req.user.id;
    const result = await masterCustomerService.updateProfile(
      customerId,
      req.body,
      req.file
    );
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async getProfile(req, res) {
    const customerId = req.user.id;
    const result = await masterCustomerService.getProfile(customerId);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }
}

module.exports = new masterCustomerController();
