const { masterCustomer } = require("../models");

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
      } = data;

      console.log(data);

      let hashedPassword = null;

      // const otp = masterCustomerService.generateOtp();
      const otp = "123456";

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
    const { customerId, otp } = data;
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

    const customerData = customer.toJSON();
    customerData.jwtToken = jwtToken;

    return {
      status: true,
      message: "Verifikasi berhasil",
      data: customerData,
    };
  }

  async resendOtpAuthentication(data) {
    const { customerId } = data;

    // const otp = masterCustomerService.generateOtp();
    const otp = "123456";

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
      const { email, phoneNumber, password, loginMethod, countryCode } = data;
      console.log(data);

      // const otp = masterCustomerService.generateOtp();
      const otp = "123456";

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

      if (password) {
        const match = await bcrypt.compare(password, customer.password);
        if (!match) return { status: false, message: "Password salah" };
      }

      if (loginMethod === "email")
        masterCustomerService.sendEmailOtp(email, otp);
      if (loginMethod === "phone") {
        const sendOtpWhatsapp = await masterCustomerService.sendWhatsappOtp(
          phoneNumber,
          otp,
          countryCode
        );
      }

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

  async getCustomerByUsername(username) {
    try {
      const customers = await masterCustomer.findAll({ where: { username: { [Op.like]: `%${username}%` } } });

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

  async updateProfile(customerId, data) {
    try {
      const { name, email, phoneNumber, username } = data;
      const customer = await masterCustomer.findByPk(customerId);
      if (!customer)
        return { status: false, message: "Customer tidak ditemukan" };

      const usernameExists = await masterCustomer.findOne({ where: { username } });
      if (usernameExists && usernameExists.id !== customerId)
        return { status: false, message: "Username sudah digunakan" };

      await customer.update({ name, email, phoneNumber, username });

      return {
        status: true,
        message: "Profile berhasil diperbarui",
        data: customer,
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
      const customer = await masterCustomer.findByPk(customerId);
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

      const mailOptions = {
        from: `"MYSKIN.ID" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Kode OTP Login Anda",
        text: `Kode OTP login Anda adalah ${otp}. Berlaku selama 5 menit.`,
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
