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
    const user = await masterUser.findOne({
      where: { email },
      include: [
        {
          model: masterRole,
          as: "role",
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
        roleId: user.roleId,
        roleCode: user.role?.roleCode,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
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
          roleCode: user.role?.roleCode,
        },
      },
    };
  },

  async createUser(data) {
    try {
      const { name, email, password, locationId, roleName } = data;

      if (!name || !email || !password || !locationId || !roleName)
        return { status: false, message: "Data tidak lengkap" };

      const role = await masterRole.findOne({
        where: { roleCode: roleName },
      });

      if (!role) {
        return {
          status: false,
          message: "Role tidak ditemukan",
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
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },

  async getUserByCompanyId(companyId) {
    try {
      if (!companyId) {
        return {
          status: false,
          message: "Data tidak lengkap",
        };
      }

      const usersCompany = await masterUser.findAll({
        attributes: ["id", "name", "email", "phone", "avatar"],
        distinct: true,
        include: [
          {
            model: masterRole,
            as: "role",
            attributes: ["id", "name"],
            where: {
              roleCode: {
                [Op.in]: ["OUTLET_ADMIN", "OUTLET_DOCTOR"],
              },
            },
          },
          {
            model: relationshipUserLocation,
            as: "userLocations",
            attributes: ["id", "isactive"],
            required: true,
            where: {
              isactive: true,
            },
            include: [
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name", "companyId"],
                required: true,
                where: {
                  companyId,
                  isactive: true,
                },
              },
            ],
          },
        ],
      });

      if (!usersCompany.length) {
        return {
          status: false,
          message: "Data users tidak ditemukan",
          data: [],
        };
      }

      return {
        status: true,
        message: "Success",
        data: usersCompany.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role?.name || null,
          location: user.userLocations?.[0]?.location?.name || null,
        })),
      };
    } catch (error) {
      console.error(error);
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },
};
