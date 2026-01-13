const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  masterUser,
  masterRole,
  relationshipUserCompany,
  masterCompany,
  relationshipUserLocation,
  masterLocation,
} = require("../models");
const { Op } = require("sequelize");

const JWT_SECRET = process.env.JWT_SECRET || "yourSecretKey";

module.exports = {
  async register(data) {
    const { name, email, password } = data;

    if (!name || !email || !password)
      return { status: false, message: "Data tidak lengkap" };

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
    const exist = await masterUser.findOne({ where: { email } });
    if (exist) {
      return {
        status: false,
        message: "Email sudah terdaftar",
        data: null,
      };
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const company = await masterCompany.create({
      name: name,
      code: name.replace(/\s+/g, "_").toUpperCase(),
      isactive: true,
    });

    // 5. Buat user admin
    const user = await masterUser.create({
      name: name,
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
        roleCode: user.role?.roleCode,
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

  async registerAdminOutlet(data) {
    const { name, email, password, locationId } = data;

    if (!name || !email || !password || !locationId)
      return { status: false, message: "Data tidak lengkap" };

    const role = await masterRole.findOne({
      where: { roleCode: "OUTLET_ADMIN" },
    });
    if (!role) {
      return {
        status: false,
        message: "Role OUTLET_ADMIN tidak ditemukan",
        data: null,
      };
    }

    const isUserExist = await masterUser.findOne({ where: { email } });
    const isLocationExist = await masterLocation.findOne({
      where: { id: locationId },
    });

    if (isUserExist) {
      return {
        status: false,
        message: "Email sudah terdaftar",
        data: null,
      };
    }

    if (!isLocationExist) {
      return {
        status: false,
        message: "Outlet tidak ditemukan",
        data: null,
      };
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await masterUser.create({
      name: name,
      email,
      roleId: role.id,
      password: hashPassword,
      isactive: true,
    });

    await relationshipUserLocation.create({
      userId: user.id,
      locationId: locationId,
      isactive: true,
    });

    return {
      status: true,
      message: "Registrasi berhasil",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roleCode: role.roleCode,
        },
      },
    };
  },

  async getUserByCompanyId(companyId) {
    try {
      if (!companyId) return { status: false, message: "Data tidak lengkap" };

      const usersCompany = await masterUser.findAll({
        include: [
          {
            model: masterRole,
            as: "role",
            attributes: ["id", "name"],
            where: {
              roleCode: {
                [Op.in]: ["CUSTOMER", "MEMBER", "VIP"],
              },
            },
          },
          {
            model: relationshipUserLocation,
            as: "userLocations",
            attributes: ["id"],
            required: true,
            where: {
              isactive: true,
            },
            include: [
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name", "companyId"],
                where: {
                  companyId,
                  isactive: true,
                },
              },
            ],
          },
        ],
      });
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },
};
