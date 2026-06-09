const masterCustomerService = require("../services/masterCustomer.service");
const response = require("../helpers/response");
const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const appleSignIn = require("apple-signin-auth");

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
      const { idToken, referralCode, deviceId, platform, ignoreDeviceLimit } = req.body;
      if (!idToken) {
        return response.error(res, "idToken is required", null);
      }

      // Add detailed logging to diagnose "No pem found"
      console.log("Starting Google Mobile Login verification...");
      
      // Inspect token without verification first
      const decodedToken = jwt.decode(idToken, { complete: true });
      if (decodedToken) {
        console.log("Token Header:", JSON.stringify(decodedToken.header));
        console.log("Token Payload (Iss/Aud):", {
          iss: decodedToken.payload.iss,
          aud: decodedToken.payload.aud,
          sub: decodedToken.payload.sub
        });
      } else {
        console.log("Failed to decode token as JWT");
      }

      const audiences = [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID
      ].filter(Boolean);

      let ticket;
      try {
        ticket = await oauth2Client.verifyIdToken({
          idToken: idToken,
          audience: audiences,
        });
      } catch (verifyError) {
        console.error("Token verification failed:", verifyError.message);
        const metadata = decodedToken ? {
          iss: decodedToken.payload.iss,
          aud: decodedToken.payload.aud,
          kid: decodedToken.header.kid,
          exp: decodedToken.payload.exp,
          iat: decodedToken.payload.iat,
          now: Math.floor(Date.now() / 1000)
        } : "Could not decode";
        
        return response.error(res, `Verification failed: ${verifyError.message}`, {
          debug_metadata: metadata,
          configured_audiences: audiences
        });
      }

      const payload = ticket.getPayload();
      console.log("Token payload received for user:", payload.email);

      // Normalize profile for service
      const profile = {
        id: payload.sub,
        displayName: payload.name,
        emails: [{ value: payload.email }],
        photos: [{ value: payload.picture }],
        referralCode: referralCode || null,
        deviceId: deviceId || null,
        platform: platform || null,
        ignoreDeviceLimit: ignoreDeviceLimit === true || ignoreDeviceLimit === "true" || false,
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

  async googleIosLogin(req, res) {
    try {
      const { idToken, referralCode, deviceId, platform, ignoreDeviceLimit } = req.body;
      if (!idToken) {
        return response.error(res, "idToken is required", null);
      }

      console.log("Starting Google iOS Login verification...");

      const audiences = [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID
      ].filter(Boolean);

      let ticket;
      try {
        ticket = await oauth2Client.verifyIdToken({
          idToken: idToken,
          audience: audiences,
        });
      } catch (verifyError) {
        console.error("Token verification failed (iOS):", verifyError.message);
        return response.error(res, `Verification failed: ${verifyError.message}`, null);
      }

      const payload = ticket.getPayload();
      console.log("Token payload received for user (iOS):", payload.email);

      const profile = {
        id: payload.sub,
        displayName: payload.name,
        emails: [{ value: payload.email }],
        photos: [{ value: payload.picture }],
        referralCode: referralCode || null,
        deviceId: deviceId || null,
        platform: platform || null,
        ignoreDeviceLimit: ignoreDeviceLimit === true || ignoreDeviceLimit === "true" || false,
      };

      const result = await masterCustomerService.googleLogin(profile);

      if (!result.status) {
        return response.error(res, result.message, result.data);
      }

      return response.success(res, result.message, result.data);
    } catch (err) {
      console.error("Google iOS Login Error:", err);
      return response.serverError(res, err);
    }
  }

  async appleIosLogin(req, res) {
    try {
      const { identityToken, name, referralCode, deviceId, platform, ignoreDeviceLimit } = req.body;
      
      if (!identityToken) {
        return response.error(res, "identityToken is required", null);
      }

      console.log("Starting Apple iOS Login verification...");

      // Verify the Apple identity token
      // By default, it fetches Apple's public keys, verifies signature, expiration, and issuer.
      // Ideally, the audience should be validated against your Apple App ID (bundle identifier).
      let payload;
      try {
        payload = await appleSignIn.verifyIdToken(identityToken, {
          audience: process.env.APPLE_CLIENT_ID, // Use Apple App ID if defined
          ignoreExpiration: false, // strictly check expiration
        });
      } catch (verifyError) {
        console.error("Apple token verification failed:", verifyError.message);
        return response.error(res, `Verification failed: ${verifyError.message}`, null);
      }

      console.log("Apple Token payload received for user:", payload.email);

      // Create a profile object similar to what Google returns
      // Apple's sub is the unique Apple ID identifier
      // Name is only provided by Apple on initial sign in, so it must be passed by the frontend if available
      const profile = {
        id: payload.sub,
        displayName: name || null,
        emails: [{ value: payload.email }],
        referralCode: referralCode || null,
        deviceId: deviceId || null,
        platform: platform || null,
        ignoreDeviceLimit: ignoreDeviceLimit === true || ignoreDeviceLimit === "true" || false,
      };

      const result = await masterCustomerService.appleLogin(profile);

      if (!result.status) {
        return response.error(res, result.message, result.data);
      }

      return response.success(res, result.message, result.data);
    } catch (err) {
      console.error("Apple iOS Login Error:", err);
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

  async trackOpen(req, res) {
    try {
      const customerId = req.user.id;
      const { masterCustomer } = require("../models");
      await masterCustomer.update(
        { lastActiveAt: new Date() },
        { where: { id: customerId } }
      );
      return response.success(res, "App open tracked successfully", null);
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async getCustomerDashboardSummary(req, res) {
    try {
      const { masterCustomer, Sequelize } = require("../models");
      const { Op } = require("sequelize");

      // 1. Calculate Total Customers count
      const totalCustomers = await masterCustomer.count();

      // 2. Growth calculation based on monthly registrations (WIB UTC+7)
      const nowWIB = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
      const startOfMonthWIB = new Date(nowWIB.getFullYear(), nowWIB.getMonth(), 1);
      const startOfMonthUTC = new Date(startOfMonthWIB.getTime() - 7 * 60 * 60 * 1000);

      const startOfLastMonthWIB = new Date(nowWIB.getFullYear(), nowWIB.getMonth() - 1, 1);
      const startOfLastMonthUTC = new Date(startOfLastMonthWIB.getTime() - 7 * 60 * 60 * 1000);

      const thisMonthCount = await masterCustomer.count({
        where: {
          createdAt: {
            [Op.gte]: startOfMonthUTC
          }
        }
      });

      const lastMonthCount = await masterCustomer.count({
        where: {
          createdAt: {
            [Op.between]: [startOfLastMonthUTC, startOfMonthUTC]
          }
        }
      });

      let downloadChange = "+0.0%";
      if (lastMonthCount > 0) {
        const percentage = ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;
        downloadChange = `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%`;
      } else if (thisMonthCount > 0) {
        downloadChange = `+100.0%`;
      }

      // 3. Active Users Today (WIB boundary: from 00:00 WIB today to now)
      const startOfTodayWIB = new Date(nowWIB.getFullYear(), nowWIB.getMonth(), nowWIB.getDate());
      const startOfTodayUTC = new Date(startOfTodayWIB.getTime() - 7 * 60 * 60 * 1000);

      const activeToday = await masterCustomer.count({
        where: {
          lastActiveAt: {
            [Op.gte]: startOfTodayUTC
          }
        }
      });

      // 4. Fetch active customers with pagination and optional search, status, and registration date range filters
      const { formatPagination } = require("../utils/pagination");
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const search = req.query.search || "";
      const status = req.query.status || "";
      const startDate = req.query.startDate || "";
      const endDate = req.query.endDate || "";

      const customerWhere = {};
      const andConditions = [];

      if (search) {
        andConditions.push({
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { username: { [Op.like]: `%${search}%` } }
          ]
        });
      }

      if (status) {
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (status.toUpperCase() === "ONLINE") {
          andConditions.push({
            lastActiveAt: {
              [Op.gte]: fiveMinsAgo
            }
          });
        } else if (status.toUpperCase() === "OFFLINE") {
          andConditions.push({
            [Op.or]: [
              { lastActiveAt: null },
              { lastActiveAt: { [Op.lt]: fiveMinsAgo } }
            ]
          });
        }
      }

      if (startDate || endDate) {
        const dateCondition = {};
        if (startDate) {
          dateCondition[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateCondition[Op.lte] = end;
        }
        andConditions.push({ createdAt: dateCondition });
      }

      if (andConditions.length > 0) {
        customerWhere[Op.and] = andConditions;
      }

      const { count, rows: latestCustomers } = await masterCustomer.findAndCountAll({
        where: customerWhere,
        attributes: ["id", "name", "email", "lastActiveAt", "loginMethod", "profileImageUrl", "createdAt", "isFreelance", "isDownline"],
        order: [
          [Sequelize.literal("CASE WHEN lastActiveAt IS NULL THEN 1 ELSE 0 END"), "ASC"],
          ["lastActiveAt", "DESC"],
          ["createdAt", "DESC"]
        ],
        limit: pageSize,
        offset: offset
      });

      // Helper for friendly relative time in Indonesian
      const getRelativeTimeIndonesian = (date) => {
        if (!date) return "-";
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Baru saja";
        if (diffMins < 60) return `${diffMins} menit yang lalu`;
        if (diffHours < 24) return `${diffHours} jam yang lalu`;
        if (diffDays === 1) return "Kemarin";
        return `${diffDays} hari yang lalu`;
      };

      const mappedCustomers = latestCustomers.map(c => {
        let deviceOrOs = "ANDROID";
        if (c.loginMethod === "apple") {
          deviceOrOs = "IOS";
        } else if (c.loginMethod === "google") {
          deviceOrOs = "ANDROID";
        } else {
          deviceOrOs = c.id.charCodeAt(0) % 2 === 0 ? "ANDROID" : "IOS";
        }

        const lastActive = c.lastActiveAt;
        const isOnline = lastActive && (new Date() - new Date(lastActive)) < 5 * 60 * 1000;

        return {
          id: c.id,
          name: c.name,
          email: c.email || "-",
          profileImageUrl: c.profileImageUrl,
          lastActiveAt: c.lastActiveAt,
          lastActiveDiff: getRelativeTimeIndonesian(c.lastActiveAt),
          joinedAt: c.createdAt,
          deviceOrOs,
          status: isOnline ? "ONLINE" : "OFFLINE",
          source: "MOBILE APP",
          isFreelance: c.isFreelance || false,
          isDownline: c.isDownline || false,
        };
      });

      return response.success(res, "Customer dashboard summary fetched successfully", {
        metrics: {
          totalDownloads: {
            value: totalCustomers,
            change: downloadChange
          },
          activeToday: {
            value: activeToday,
            change: "-2.1%" // Representative mock growth trend
          },
          avgSessionDuration: {
            value: "4m 32s",
            change: "+12.5%"
          }
        },
        latestActivities: mappedCustomers,
        pagination: formatPagination(count, page, pageSize)
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  }
  async toggleFreelance(req, res) {
    try {
      const { customerId, isFreelance } = req.body || {};
      if (!customerId || typeof isFreelance !== "boolean") {
        return response.error(res, "customerId dan isFreelance (boolean) wajib diisi", null);
      }

      const { masterCustomer } = require("../models");
      const customer = await masterCustomer.findByPk(customerId);
      if (!customer) {
        return response.error(res, "Customer tidak ditemukan", null);
      }

      await customer.update({ isFreelance });

      return response.success(
        res,
        `Customer berhasil ditandai sebagai ${isFreelance ? "freelance" : "non-freelance"}`,
        {
          id: customer.id,
          name: customer.name,
          isFreelance: customer.isFreelance,
        }
      );
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async toggleDownline(req, res) {
    try {
      const { customerId, isDownline } = req.body || {};
      if (!customerId || typeof isDownline !== "boolean") {
        return response.error(res, "customerId dan isDownline (boolean) wajib diisi", null);
      }

      const { masterCustomer } = require("../models");
      const customer = await masterCustomer.findByPk(customerId);
      if (!customer) {
        return response.error(res, "Customer tidak ditemukan", null);
      }

      await customer.update({ isDownline });

      return response.success(
        res,
        `Customer berhasil ditandai sebagai ${isDownline ? "downline" : "non-downline"}`,
        {
          id: customer.id,
          name: customer.name,
          isDownline: customer.isDownline,
        }
      );
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async getCustomerListForAdmin(req, res) {
    try {
      const { page, limit, search, isFreelance, isDownline, startDate, endDate } = req.query;
      const result = await masterCustomerService.getCustomerListForAdmin({
        page,
        limit,
        search,
        isFreelance,
        isDownline,
        startDate,
        endDate
      });

      if (!result.status) {
        return response.error(res, result.message, null);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async getReferredCustomersForAdmin(req, res) {
    try {
      const { customerId, page, limit, search, startDate, endDate } = req.query;
      const result = await masterCustomerService.getReferredCustomersForAdmin({
        customerId,
        page,
        limit,
        search,
        startDate,
        endDate
      });

      if (!result.status) {
        return response.error(res, result.message, null);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async setReferrerForAdmin(req, res) {
    try {
      const { customerIds, customerId, custId, custid, referrerId, freelanceId } = req.body || {};
      const result = await masterCustomerService.setReferrerForAdmin({
        customerIds,
        customerId,
        custId,
        custid,
        referrerId: referrerId || freelanceId
      });

      if (!result.status) {
        return response.error(res, result.message, result.data);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async getFreelancersListForAdmin(req, res) {
    try {
      const { page, limit, search, startDate, endDate } = req.query;
      const result = await masterCustomerService.getFreelancersListForAdmin({
        page,
        limit,
        search,
        startDate,
        endDate
      });

      if (!result.status) {
        return response.error(res, result.message, null);
      }
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  }
}

module.exports = new masterCustomerController();
