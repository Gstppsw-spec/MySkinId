const { masterCustomer, customerDevice, sequelize } = require("../models");
const referralService = require("./referral.service");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const nodemailer = require("nodemailer");
const { Op } = require("sequelize");


const JWT_SECRET = process.env.JWT_SECRET || "yourSecretKey";
const API_KEY_WHATSAPP = process.env.API_KEY_WHATSAPP;

class masterCustomerService {
  async registerCustomer(data) {
    try {
      const {
        name,
        email,
        phoneNumber,
        googleId,
        password,
        loginMethod,
        countryCode,
        otpType,
        referralCode,
        deviceId,
        platform,
      } = data;

      const shouldCheckDevice = deviceId &&
                                process.env.DISABLE_DEVICE_LIMIT !== "true" &&
                                data.ignoreDeviceLimit !== true &&
                                data.ignoreDeviceLimit !== "true";

      if (shouldCheckDevice) {
        const existingDevice = await customerDevice.findOne({
          where: { deviceId, isActive: true },
        });
        if (existingDevice) {
          let targetCustomerId = null;
          if (email) {
            const existEmail = await masterCustomer.findOne({ where: { email } });
            if (existEmail) targetCustomerId = existEmail.id;
          } else if (phoneNumber) {
            const existPhone = await masterCustomer.findOne({ where: { phoneNumber } });
            if (existPhone) targetCustomerId = existPhone.id;
          }

          if (existingDevice.customerId !== targetCustomerId) {
            return {
              status: false,
              message: "Perangkat ini sudah digunakan oleh akun lain",
            };
          }
        }
      }

      console.log(data);

      let hashedPassword = null;

      const otp = masterCustomerService.generateOtp();
      // const otp = "123456";

      if (loginMethod !== "google" && password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      if (loginMethod == "phone") {
        if (!password)
          return { status: false, message: "Password tidak boleh kosong" };

        if (!phoneNumber)
          return { status: false, message: "Nomor tidak boleh kosong" };
      }

      if (loginMethod == "email") {
        if (!password)
          return { status: false, message: "Password tidak boleh kosong" };

        if (!email)
          return { status: false, message: "Email tidak boleh kosong" };
      }

      if (email) {
        const existEmail = await masterCustomer.findOne({
          where: { email, isActive: true },
        });
        if (existEmail)
          return { status: false, message: "Email already registered" };

        const existEmailInActive = await masterCustomer.findOne({
          where: { email, isActive: false },
        });

        if (existEmailInActive) {
          await existEmailInActive.update({
            name,
            googleId,
            loginMethod,
            password: hashedPassword,
            emailVerified: false,
            phoneVerified: false,
            countryCode: countryCode,
            otpCode: otp,
            otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
            otpType,
          });

          const sendOtpEmail = await masterCustomerService.sendEmailOtp(
            email,
            otp
          );
          console.log(sendOtpEmail);

          // Apply referral if code provided
          if (referralCode) {
            await referralService.applyReferral(existEmailInActive.id, referralCode);
          }

          return {
            status: true,
            message: "Customer re-activated successfully",
            data: {
              customerId: existEmailInActive.id,
            },
          };
        }
      }

      if (phoneNumber) {
        const existPhone = await masterCustomer.findOne({
          where: { phoneNumber, isActive: true },
        });

        if (existPhone)
          return { status: false, message: "Phone number already registered" };

        const existPhoneInActive = await masterCustomer.findOne({
          where: { phoneNumber, isActive: false },
        });

        if (existPhoneInActive) {
          await existPhoneInActive.update({
            name,
            googleId,
            loginMethod,
            password: hashedPassword,
            emailVerified: false,
            phoneVerified: false,
            countryCode: countryCode,
            otpCode: otp,
            otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
            otpType,
          });

          const sendOtpWhatsapp = await masterCustomerService.sendWhatsappOtp(
            phoneNumber,
            otp,
            countryCode
          );

          console.log(sendOtpWhatsapp);

          // Apply referral if code provided
          if (referralCode) {
            await referralService.applyReferral(existPhoneInActive.id, referralCode);
          }

          return {
            status: true,
            message: "Customer re-activated successfully",
            data: {
              customerId: existPhoneInActive.id,
            },
          };
        }
      }

      if (googleId) {
        const existGoogle = await masterCustomer.findOne({
          where: { googleId },
        });
        if (existGoogle)
          return {
            status: false,
            message: "Google account already registered",
          };
      }

      const customer = await masterCustomer.create({
        name,
        email,
        phoneNumber,
        googleId,
        loginMethod,
        password: hashedPassword,
        emailVerified: false,
        phoneVerified: false,
        countryCode: countryCode,
        otpCode: otp,
        otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        otpType,
      });

      // Apply referral if code provided
      if (referralCode) {
        await referralService.applyReferral(customer.id, referralCode);
      }

      if (loginMethod === "email") {
        const sendOtpEmail = await masterCustomerService.sendEmailOtp(
          email,
          otp
        );
        console.log(sendOtpEmail);
      }
      if (loginMethod === "phone") {
        const sendOtpWhatsapp = await masterCustomerService.sendWhatsappOtp(
          phoneNumber,
          otp,
          countryCode
        );

        console.log(sendOtpWhatsapp);
      }

      return {
        status: true,
        message: "Customer registered successfully",
        data: {
          customerId: customer.id,
          referralApplied: !!referralCode,
        },
      };
    } catch (error) {
      return {
        status: false,
        message: error,
      };
    }
  }

  static generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async verifyOtp(data) {
    const { customerId, otp, deviceId, platform, ignoreDeviceLimit } = data;

    const shouldCheckDevice = deviceId &&
                              process.env.DISABLE_DEVICE_LIMIT !== "true" &&
                              ignoreDeviceLimit !== true &&
                              ignoreDeviceLimit !== "true";

    if (shouldCheckDevice) {
      const existingDevice = await customerDevice.findOne({
        where: { deviceId, isActive: true },
      });
      if (existingDevice && existingDevice.customerId !== customerId) {
        return {
          status: false,
          message: "Perangkat ini sudah digunakan oleh akun lain",
        };
      }
    }

    const customer = await masterCustomer.findByPk(customerId);
    if (!customer)
      return {
        status: false,
        message: "Customer tidak ditemukan",
      };

    if (!customer.otpCode)
      return {
        status: false,
        message: "Anda belum belakukan login ataupun registrasi",
      };

    if (customer.otpCode !== otp)
      return {
        status: false,
        message: "Kode OTP salah",
      };

    if (new Date() > customer.otpExpiresAt)
      return {
        status: false,
        message: "Kode OTP sudah kadaluarsa",
      };

    if (customer.otpType === "email") customer.emailVerified = true;
    if (customer.otpType === "phone") customer.phoneVerified = true;

    customer.isActive = true;

    customer.otpCode = null;
    customer.otpType = null;
    customer.otpExpiresAt = null;

    const jwtToken = jwt.sign({ id: customer.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // customer.jwtToken = jwtToken;
    await customer.save();

    if (deviceId) {
      await customerDevice.upsert({
        deviceId,
        customerId: customer.id,
        platform,
        isActive: true,
      });
    }

    const customerData = customer.toJSON();
    customerData.jwtToken = jwtToken;

    // Remove sensitive fields
    delete customerData.googleId;
    delete customerData.loginMethod;
    delete customerData.password;
    delete customerData.emailVerified;
    delete customerData.phoneVerified;
    delete customerData.otpCode;
    delete customerData.otpType;
    delete customerData.otpExpiredAt;
    delete customerData.lastLoginAt;

    return {
      status: true,
      message: "Verifikasi berhasil",
      data: customerData,
    };
  }

  async resendOtpAuthentication(data) {
    const { customerId } = data;

    const otp = masterCustomerService.generateOtp();
    // const otp = "123456";

    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const customer = await masterCustomer.findByPk(customerId);

    if (!customer)
      return { status: false, message: "customer tidak ditemukan" };

    if (customer.otpCode == null)
      return {
        status: false,
        message: "Customer belum melakukan login ataupun registrasi",
      };

    await customer.update({
      otpCode: otp,
      otpExpiresAt: otpExpiresAt,
    });

    if (customer.otpType == "phone") {
      await masterCustomerService.sendWhatsappOtp(
        customer.phoneNumber,
        otp,
        customer.countryCode
      );
    }

    if (customer.otpType == "email") {
      await masterCustomerService.sendEmailOtp(customer.email, otp);
    }

    return {
      status: true,
      message: "Kode verifikasi berhasil dikirim ulang",
    };
  }

  async loginCustomer(data) {
    try {
      const { email, phoneNumber, password, loginMethod, countryCode, deviceId, ignoreDeviceLimit } = data;
      console.log(data);

      const otp = masterCustomerService.generateOtp();
      // const otp = "123456";

      if (loginMethod == "phone") {
        if (!password)
          return { status: false, message: "Password tidak boleh kosong" };

        if (!phoneNumber)
          return { status: false, message: "Nomor tidak boleh kosong" };
      }

      if (loginMethod == "email") {
        if (!password)
          return { status: false, message: "Password tidak boleh kosong" };

        if (!email)
          return { status: false, message: "Email tidak boleh kosong" };
      }

      let customer;

      if (email) customer = await masterCustomer.findOne({ where: { email } });
      if (phoneNumber)
        customer = await masterCustomer.findOne({ where: { phoneNumber } });

      if (!customer)
        return { status: false, message: "Customer belum terdaftar" };

      const shouldCheckDevice = deviceId &&
                                process.env.DISABLE_DEVICE_LIMIT !== "true" &&
                                ignoreDeviceLimit !== true &&
                                ignoreDeviceLimit !== "true";

      if (shouldCheckDevice) {
        const existingDevice = await customerDevice.findOne({
          where: { deviceId, isActive: true },
        });
        if (existingDevice && existingDevice.customerId !== customer.id) {
          return {
            status: false,
            message: "Perangkat ini sudah digunakan oleh akun lain",
          };
        }
      }

      if (password) {
        const match = await bcrypt.compare(password, customer.password);
        if (!match) return { status: false, message: "Password salah" };
      }

      if (loginMethod === "email") {
        await masterCustomerService.sendEmailOtp(email, otp);
      }

      if (loginMethod === "phone") {
        await masterCustomerService.sendWhatsappOtp(
          phoneNumber,
          otp,
          countryCode
        );
      }

      // Log OTP to console for debugging/testing purposes
      console.log(`\x1b[33m%s\x1b[0m`, `[DEBUG] OTP for ${email || phoneNumber}: ${otp}`);

      await customer.update({
        loginMethod,
        otpCode: otp,
        otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        otpType: loginMethod,
      });

      return {
        status: true,
        message: "Customer ditemukan, lakukan verifikasi",
        data: {
          customerId: customer.id,
        },
      };
    } catch (error) {
      return {
        status: false,
        message: error,
      };
    }
  }

  async getCustomerByUserId(targetUserId, currentUserId) {
    try {
      const attributes = ["id", "name", "username", "profileImageUrl"];

      // Stats
      attributes.push([
        sequelize.literal(`(
            SELECT COUNT(*)
            FROM followers AS f
            WHERE
                f.followingId = masterCustomer.id
        )`),
        "followersCount",
      ]);

      attributes.push([
        sequelize.literal(`(
            SELECT COUNT(*)
            FROM followers AS f
            WHERE
                f.followerId = masterCustomer.id
        )`),
        "followingCount",
      ]);

      attributes.push([
        sequelize.literal(`(
            SELECT COUNT(*)
            FROM posts AS p
            WHERE
                p.userId = masterCustomer.id
        )`),
        "totalPost",
      ]);

      if (currentUserId) {
        attributes.push([
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM followers AS f
            WHERE
                f.followingId = masterCustomer.id
                AND f.followerId = '${currentUserId}'
        ) > 0`),
          "isFollowing",
        ]);
      } else {
        attributes.push([sequelize.literal("false"), "isFollowing"]);
      }

      const customer = await masterCustomer.findByPk(targetUserId, {
        attributes: attributes,
      });

      if (!customer) {
        return {
          status: false,
          message: "Customer tidak ditemukan",
        };
      }

      return {
        status: true,
        message: "Customer ditemukan",
        data: customer,
      };
    } catch (error) {
      return {
        status: false,
        message: error,
      };
    }
  }

  async getCustomerByUsername(username, currentUserId = null) {
    try {
      const attributes = ["id", "name", "username", "profileImageUrl"];

      if (currentUserId) {
        console.log("currentUserId", currentUserId);
        attributes.push([
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM followers AS f
            WHERE
                f.followingId = masterCustomer.id
                AND f.followerId = '${currentUserId}'
        ) > 0`),
          "isFollowing",
        ]);
      } else {
        attributes.push([sequelize.literal("false"), "isFollowing"]);
      }

      const whereCondition = {
        [Op.or]: [
          { username: { [Op.like]: `%${username}%` } },
          { name: { [Op.like]: `%${username}%` } }
        ]
      };
      if (currentUserId) {
        whereCondition.id = { [Op.ne]: currentUserId };
      }

      const customers = await masterCustomer.findAll({
        where: whereCondition,
        attributes: attributes,
      });

      return {
        status: true,
        message: "Customer ditemukan",
        data: customers,
      };
    } catch (error) {
      return {
        status: false,
        message: error,
      };
    }
  }

  async updateProfile(customerId, data, file) {
    try {
      const { name, email, phoneNumber, username } = data;
      const customer = await masterCustomer.findByPk(customerId);
      if (!customer)
        return { status: false, message: "Customer tidak ditemukan" };

      if (username) {
        const usernameExists = await masterCustomer.findOne({ where: { username } });
        if (usernameExists && usernameExists.id !== customerId)
          return { status: false, message: "Username sudah digunakan" };
      }

      if (email) {
        const emailExists = await masterCustomer.findOne({
          where: { email, id: { [Op.ne]: customerId } },
        });
        if (emailExists)
          return { status: false, message: "Email sudah digunakan oleh akun lain" };
      }

      if (phoneNumber) {
        const phoneExists = await masterCustomer.findOne({
          where: { phoneNumber, id: { [Op.ne]: customerId } },
        });
        if (phoneExists)
          return { status: false, message: "Nomor HP sudah digunakan oleh akun lain" };
      }

      let updateData = { name, email, phoneNumber, username };

      if (file) {
        // If there is an old image, maybe delete it? (Optional, implementing overwrite logic)
        // if (customer.profileImageUrl) {
        //   const oldPath = customer.profileImageUrl;
        //   if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        // }
        // For now just update the path. The model getter prepends BASE_URL, so we store the relative path.
        updateData.profileImageUrl = file.path.replace(/\\/g, "/");
      }

      await customer.update(updateData);

      const updatedCustomer = await masterCustomer.findByPk(customerId, {
        attributes: {
          exclude: [
            "googleId",
            "loginMethod",
            "password",
            "emailVerified",
            "phoneVerified",
            "otpCode",
            "otpType",
            "otpExpiredAt",
            "lastLoginAt"
          ],
        },
      });

      return {
        status: true,
        message: "Profile berhasil diperbarui",
        data: updatedCustomer,
      };
    } catch (error) {
      return {
        status: false,
        message: error,
      };
    }
  }

  async getProfile(customerId) {
    try {
      const customer = await masterCustomer.findByPk(customerId, {
        attributes: {
          exclude: [
            "googleId",
            "loginMethod",
            "password",
            "emailVerified",
            "phoneVerified",
            "otpCode",
            "otpType",
            "otpExpiredAt",
            "lastLoginAt"
          ],
        },
      });
      if (!customer)
        return { status: false, message: "Customer tidak ditemukan" };

      return {
        status: true,
        message: "Profile berhasil ditemukan",
        data: customer,
      };
    } catch (error) {
      return {
        status: false,
        message: error,
      };
    }
  }

  static async sendEmailOtp(email, otp) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });

      console.log(`[DEBUG] EMAIL_USER: ${process.env.EMAIL_USER}`);
      console.log(`[DEBUG] EMAIL_APP_PASSWORD length: ${process.env.EMAIL_APP_PASSWORD?.length}`);
      console.log(transporter);

      const mailOptions = {
        from: `"MYSKIN.ID" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "[MYSKIN.ID] Kode Verifikasi OTP Anda",
        text: `Halo,\n\nKode verifikasi OTP Anda adalah: ${otp}\n\nKode ini bersifat rahasia dan berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun untuk menjaga keamanan akun Anda.\n\nTerima kasih,\nTim MYSKIN.ID`,
      };

      const info = await transporter.sendMail(mailOptions);

      console.log(info);

      console.log(mailOptions);

      return {
        status: true,
        message: "OTP email terkirim",
      };
    } catch (error) {
      console.error("Email send error:", error);
      return {
        status: false,
        message: "Gagal mengirim OTP email",
        error: error.message,
      };
    }
  }

  static async sendWhatsappOtp(phoneNumber, otp, countryCode) {
    try {
      if (!API_KEY_WHATSAPP) {
        return {
          status: false,
          message: "Konfigurasi WhatsApp API tidak tersedia",
        };
      }

      const finalNumber = masterCustomerService.normalizeNumber(
        phoneNumber,
        countryCode
      );

      const message = `Kode Verifikasi: *${otp}*\n\nGunakan kode di atas untuk verifikasi akun Anda. Kode ini berlaku selama *5 menit*.\n\n*Keamanan:* Jangan bagikan kode ini kepada siapa pun, termasuk pihak yang mengaku dari tim kami.\n\nTerima kasih,\nTim Layanan`;

      const payload = {
        recipient_type: "individual",
        to: finalNumber,
        type: "text",
        text: {
          body: message,
        },
      };

      const { data } = await axios.post(
        "https://wa7029.cloudwa.my.id/api/v1/messages",
        payload,
        {
          headers: {
            Authorization: `Bearer ${API_KEY_WHATSAPP}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        status: true,
        message: "Kode verifikasi berhasil dikirim via WhatsApp",
        data,
      };
    } catch (error) {
      return {
        status: false,
        message: "Gagal mengirim kode verifikasi. Silakan coba kembali.",
        error: error.response?.data || null,
      };
    }
  }

  async googleLogin(profile) {
    try {
      const { id, displayName, emails, photos, deviceId, platform, ignoreDeviceLimit } = profile;
      const email = emails && emails.length > 0 ? emails[0].value : null;
      const profileImageUrl = photos && photos.length > 0 ? photos[0].value : null;

      let customer = await masterCustomer.findOne({
        where: { googleId: id },
      });

      if (!customer && email) {
        customer = await masterCustomer.findOne({
          where: { email },
        });
      }

      const shouldCheckDevice = deviceId &&
                                process.env.DISABLE_DEVICE_LIMIT !== "true" &&
                                ignoreDeviceLimit !== true &&
                                ignoreDeviceLimit !== "true";

      if (shouldCheckDevice) {
        const existingDevice = await customerDevice.findOne({
          where: { deviceId, isActive: true },
        });
        if (existingDevice) {
          if (!customer || existingDevice.customerId !== customer.id) {
            return {
              status: false,
              message: "Perangkat ini sudah digunakan oleh akun lain",
            };
          }
        }
      }

      if (customer) {
        if (customer.googleId !== id) {
          await customer.update({
            googleId: id,
            loginMethod: "google",
            isActive: true,
            emailVerified: true,
          });
        }
      } else {
        // Create new customer
        customer = await masterCustomer.create({
          name: displayName,
          email: email,
          googleId: id,
          loginMethod: "google",
          isActive: true, // Auto-active for Google login
          emailVerified: true,
          profileImageUrl: profileImageUrl,
        });

        // Apply referral if code provided
        if (profile.referralCode) {
          await referralService.applyReferral(customer.id, profile.referralCode);
        }
      }

      if (deviceId) {
        await customerDevice.upsert({
          deviceId,
          customerId: customer.id,
          platform,
          isActive: true,
        });
      }

      const jwtToken = jwt.sign({ id: customer.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      const customerData = customer.toJSON();
      customerData.jwtToken = jwtToken;

      // Clean sensitive data
      delete customerData.googleId;
      delete customerData.loginMethod;
      delete customerData.password;
      delete customerData.otpCode;
      delete customerData.otpType;
      delete customerData.otpExpiresAt;

      return {
        status: true,
        message: "Google login successful",
        data: customerData,
      };
    } catch (error) {
      console.error("Google login error:", error);
      return {
        status: false,
        message: error.message || "Error during Google login",
      };
    }
  }

  async appleLogin(profile) {
    try {
      const { id, displayName, emails, deviceId, platform, ignoreDeviceLimit } = profile;
      const email = emails && emails.length > 0 ? emails[0].value : null;

      let customer = await masterCustomer.findOne({
        where: { appleId: id },
      });

      if (!customer && email) {
        customer = await masterCustomer.findOne({
          where: { email },
        });
      }

      const shouldCheckDevice = deviceId &&
                                process.env.DISABLE_DEVICE_LIMIT !== "true" &&
                                ignoreDeviceLimit !== true &&
                                ignoreDeviceLimit !== "true";

      if (shouldCheckDevice) {
        const existingDevice = await customerDevice.findOne({
          where: { deviceId, isActive: true },
        });
        if (existingDevice) {
          if (!customer || existingDevice.customerId !== customer.id) {
            return {
              status: false,
              message: "Perangkat ini sudah digunakan oleh akun lain",
            };
          }
        }
      }

      if (customer) {
        if (customer.appleId !== id) {
          await customer.update({
            appleId: id,
            loginMethod: "apple",
            isActive: true,
            emailVerified: true,
          });
        }
      } else {
        // Create new customer
        customer = await masterCustomer.create({
          name: displayName || "Apple User",
          email: email,
          appleId: id,
          loginMethod: "apple",
          isActive: true, // Auto-active for Apple sign-in
          emailVerified: !!email,
        });

        // Apply referral if code provided
        if (profile.referralCode) {
          await referralService.applyReferral(customer.id, profile.referralCode);
        }
      }

      if (deviceId) {
        await customerDevice.upsert({
          deviceId,
          customerId: customer.id,
          platform,
          isActive: true,
        });
      }

      const jwtToken = jwt.sign({ id: customer.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      const customerData = customer.toJSON();
      customerData.jwtToken = jwtToken;

      // Clean sensitive data
      delete customerData.appleId;
      delete customerData.googleId;
      delete customerData.loginMethod;
      delete customerData.password;
      delete customerData.otpCode;
      delete customerData.otpType;
      delete customerData.otpExpiresAt;

      return {
        status: true,
        message: "Apple login successful",
        data: customerData,
      };
    } catch (error) {
      console.error("Apple login error:", error);
      return {
        status: false,
        message: error.message || "Error during Apple login",
      };
    }
  }

  async getCustomerListForAdmin(filters) {
    try {
      const { page = 1, limit = 10, search, isFreelance, startDate, endDate } = filters;
      const { getPagination, formatPagination } = require("../utils/pagination");
      const { limit: queryLimit, offset } = getPagination(page, limit);

      const whereCondition = {};
      const andConditions = [];

      if (search) {
        andConditions.push({
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phoneNumber: { [Op.like]: `%${search}%` } },
          ]
        });
      }

      if (isFreelance !== undefined && isFreelance !== '') {
        const freelanceBool = isFreelance === true || isFreelance === 'true';
        andConditions.push({ isFreelance: freelanceBool });
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
        whereCondition[Op.and] = andConditions;
      }

      const { count, rows: customers } = await masterCustomer.findAndCountAll({
        where: whereCondition,
        attributes: [
          "id", "name", "username", "email", "phoneNumber", "countryCode",
          "profileImageUrl", "isActive", "isFreelance", "lastActiveAt", "createdAt"
        ],
        order: [["createdAt", "DESC"]],
        limit: queryLimit,
        offset: offset,
      });

      return {
        status: true,
        message: "Customer list fetched successfully",
        data: {
          items: customers,
          pagination: formatPagination(count, page, limit),
        },
      };
    } catch (error) {
      console.error("getCustomerListForAdmin error:", error);
      return {
        status: false,
        message: error.message || "Error fetching customer list",
      };
    }
  }

  async getReferredCustomersForAdmin(filters) {
    try {
      const { customerId, page = 1, limit = 10, search, startDate, endDate } = filters;
      if (!customerId) {
        return { status: false, message: "customerId wajib diisi" };
      }

      const { getPagination, formatPagination } = require("../utils/pagination");
      const { limit: queryLimit, offset } = getPagination(page, limit);

      const overallCount = await masterCustomer.count({
        where: { referredBy: customerId }
      });

      const whereCondition = { referredBy: customerId };
      const andConditions = [];

      if (search) {
        andConditions.push({
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phoneNumber: { [Op.like]: `%${search}%` } },
          ]
        });
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
        whereCondition[Op.and] = andConditions;
      }

      const { count: filteredCount, rows: items } = await masterCustomer.findAndCountAll({
        where: whereCondition,
        attributes: [
          "id", "name", "username", "email", "phoneNumber", "countryCode",
          "profileImageUrl", "isActive", "createdAt"
        ],
        order: [["createdAt", "DESC"]],
        limit: queryLimit,
        offset: offset,
      });

      return {
        status: true,
        message: "Referred customers list fetched successfully",
        data: {
          overallTotal: overallCount,
          filteredTotal: filteredCount,
          items,
          pagination: formatPagination(filteredCount, page, limit),
        }
      };
    } catch (error) {
      console.error("getReferredCustomersForAdmin error:", error);
      return {
        status: false,
        message: error.message || "Error fetching referred customers list",
      };
    }
  }

  async setReferrerForAdmin({ customerIds, customerId, custId, custid, referrerId }) {
    try {
      if (!referrerId) {
        return { status: false, message: "referrerId (freelance/busdev) wajib diisi" };
      }

      let ids = [];
      const addId = (val) => {
        if (!val) return;
        if (Array.isArray(val)) {
          ids.push(...val);
        } else if (typeof val === "string") {
          ids.push(val);
        }
      };

      addId(customerIds);
      addId(customerId);
      addId(custId);
      addId(custid);

      // Remove duplicates and filter empty/falsy values
      ids = [...new Set(ids.filter(Boolean))];

      if (ids.length === 0) {
        return { status: false, message: "customerIds, customerId, custId, atau custid wajib diisi" };
      }

      const referrer = await masterCustomer.findByPk(referrerId);
      if (!referrer) {
        return { status: false, message: "Referrer (freelance/busdev) tidak ditemukan" };
      }

      const validIds = [];
      const errors = [];

      for (const id of ids) {
        if (id === referrerId) {
          errors.push({ id, message: "Customer tidak dapat mereferensikan diri sendiri" });
          continue;
        }

        const customer = await masterCustomer.findByPk(id);
        if (!customer) {
          errors.push({ id, message: "Customer tidak ditemukan" });
          continue;
        }

        validIds.push(id);
      }

      if (validIds.length === 0) {
        return {
          status: false,
          message: "Tidak ada customer ID yang valid untuk diproses",
          errors
        };
      }

      await masterCustomer.update(
        { referredBy: referrerId },
        { where: { id: { [Op.in]: validIds } } }
      );

      return {
        status: true,
        message: `Berhasil mengaitkan ${validIds.length} customer ke referrer secara manual`,
        data: {
          processedCount: validIds.length,
          referrerId: referrer.id,
          referrerName: referrer.name,
          errors: errors.length > 0 ? errors : undefined
        }
      };
    } catch (error) {
      console.error("setReferrerForAdmin error:", error);
      return {
        status: false,
        message: error.message || "Error setting referrer",
      };
    }
  }

  async getFreelancersListForAdmin(filters) {
    try {
      const { page = 1, limit = 10, search, startDate, endDate } = filters;
      const { getPagination, formatPagination } = require("../utils/pagination");
      const { limit: queryLimit, offset } = getPagination(page, limit);

      const whereCondition = { isFreelance: true };
      const andConditions = [];

      if (search) {
        andConditions.push({
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phoneNumber: { [Op.like]: `%${search}%` } },
          ]
        });
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
        whereCondition[Op.and] = andConditions;
      }

      const { count, rows: freelancers } = await masterCustomer.findAndCountAll({
        where: whereCondition,
        attributes: [
          "id", "name", "username", "email", "phoneNumber", "countryCode",
          "referralCode", "profileImageUrl", "isActive", "createdAt"
        ],
        include: [
          {
            model: sequelize.models.referralBalance,
            as: "referralBalance",
            attributes: ["balance", "totalEarned", "totalWithdrawn"]
          }
        ],
        order: [["createdAt", "DESC"]],
        limit: queryLimit,
        offset: offset,
      });

      // Map freelancers to include referred count
      const items = await Promise.all(
        freelancers.map(async (f) => {
          const referredCount = await masterCustomer.count({
            where: { referredBy: f.id }
          });

          return {
            id: f.id,
            name: f.name,
            username: f.username,
            email: f.email,
            phoneNumber: f.phoneNumber,
            countryCode: f.countryCode,
            referralCode: f.referralCode,
            profileImageUrl: f.profileImageUrl,
            isActive: f.isActive,
            createdAt: f.createdAt,
            referredCount,
            balance: f.referralBalance ? parseFloat(f.referralBalance.balance) : 0,
            totalEarned: f.referralBalance ? parseFloat(f.referralBalance.totalEarned) : 0,
            totalWithdrawn: f.referralBalance ? parseFloat(f.referralBalance.totalWithdrawn) : 0,
          };
        })
      );

      // Get overall total freelancers count
      const totalFreelancers = await masterCustomer.count({
        where: { isFreelance: true }
      });

      // Get all freelancer IDs to count their total referred customers
      const allFreelancers = await masterCustomer.findAll({
        where: { isFreelance: true },
        attributes: ["id"]
      });
      const freelancerIds = allFreelancers.map(f => f.id);

      const totalReferredByAllFreelancers = freelancerIds.length > 0
        ? await masterCustomer.count({ where: { referredBy: { [Op.in]: freelancerIds } } })
        : 0;

      return {
        status: true,
        message: "Freelancers list fetched successfully",
        data: {
          stats: {
            totalFreelancers,
            totalReferredByAllFreelancers,
          },
          items,
          pagination: formatPagination(count, page, limit),
        },
      };
    } catch (error) {
      console.error("getFreelancersListForAdmin error:", error);
      return {
        status: false,
        message: error.message || "Error fetching freelancers list",
      };
    }
  }

  static normalizeNumber(phoneNumber, countryCode = "62") {
    phoneNumber = phoneNumber.toString().replace(/[^0-9]/g, "");
    countryCode = countryCode.toString().replace(/[^0-9]/g, "");

    if (phoneNumber.startsWith("0")) {
      phoneNumber = phoneNumber.substring(1);
    }

    return `${countryCode}${phoneNumber}`;
  }
}

module.exports = new masterCustomerService();
