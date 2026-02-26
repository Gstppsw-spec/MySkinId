const masterCustomerService = require("../services/masterCustomer.service");
const response = require("../helpers/response");
const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

class masterCustomerController {
  async googleRedirect(req, res) {
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });

    res.redirect(url);
  }

  async googleCallback(req, res) {
    try {
      const { code } = req.query;
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: "v2",
      });

      const { data } = await oauth2.userinfo.get();

      // Normalize profile to match service expectations
      const profile = {
        id: data.id,
        displayName: data.name,
        emails: [{ value: data.email }],
        photos: [{ value: data.picture }],
      };

      const result = await masterCustomerService.googleLogin(profile);

      if (!result.status) {
        return response.error(res, result.message, result.data);
      }

      // Instead of JSON, you might want to redirect to a frontend URL with the token
      // For now, return JSON for verification
      return response.success(res, result.message, result.data);
    } catch (err) {
      console.error("Google Callback Error:", err);
      return response.serverError(res, err);
    }
  }

  async googleMobileLogin(req, res) {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return response.error(res, "idToken is required", null);
      }

      const ticket = await oauth2Client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      // Normalize profile for service
      const profile = {
        id: payload.sub,
        displayName: payload.name,
        emails: [{ value: payload.email }],
        photos: [{ value: payload.picture }],
      };

      const result = await masterCustomerService.googleLogin(profile);

      if (!result.status) {
        return response.error(res, result.message, result.data);
      }

      return response.success(res, result.message, result.data);
    } catch (err) {
      console.error("Google Mobile Login Error:", err);
      return response.serverError(res, err);
    }
  }

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
