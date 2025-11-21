const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  masterUser,
  masterRole,
  relationshipUserCompany,
  masterCompany,
} = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "yourSecretKey";

module.exports = {
  async register(data) {
    const { name, email, password } = data;

    // 1. Ambil role COMPANY_ADMIN
    const role = await masterRole.findOne({
      where: { roleCode: "COMPANY_ADMIN" },
    });
    if (!role) {
      return {
        status: false,
        message: "Role COMPANY_ADMIN tidak ditemukan",
        data: null,
      };
    }

    // 2. Cek apakah email sudah digunakan
    const exist = await masterUser.findOne({ where: { email } });
    if (exist) {
      return {
        status: false,
        message: "Email sudah terdaftar",
        data: null,
      };
    }

    // 3. Hash password
    const hashPassword = await bcrypt.hash(password, 10);

    // 4. Buat perusahaan (name jadi nama perusahaan)
    const company = await masterCompany.create({
      name: name,
      code: name.replace(/\s+/g, "_").toUpperCase(),
      isactive: true,
    });

    // 5. Buat user admin
    const user = await masterUser.create({
      name: name, // nama user = nama company
      email,
      roleId: role.id,
      password: hashPassword,
      isactive: true,
    });

    // 6. Buat relasi user-company
    await relationshipUserCompany.create({
      userId: user.id,
      companyId: company.id,
      isactive: true,
    });

    return {
      status: true,
      message: "Registrasi berhasil",
      data: {
        company: {
          id: company.id,
          name: company.name,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roleCode: role.roleCode,
        },
      },
    };
  },
  async login(email, password) {
    // Cari user beserta role
    const user = await masterUser.findOne({
      where: { email },
      include: [
        {
          model: masterRole,
          as: "role", // pastikan alias relasi di model sudah sesuai
          attributes: ["roleCode"],
        },
      ],
    });

    if (!user) {
      return {
        status: false,
        message: "User tidak ditemukan",
        data: null,
      };
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return {
        status: false,
        message: "Password salah",
        data: null,
      };
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        roleCode: user.role?.roleCode, // tambahkan roleCode di token
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    await user.update({ jwtToken: token });

    return {
      status: true,
      message: "Login berhasil",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          roleId: user.roleId,
          roleCode: user.role?.roleCode, // kirim roleCode juga
        },
      },
    };
  },
};
