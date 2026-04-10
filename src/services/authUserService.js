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

    // await user.update({ jwtToken: token });

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
      const { name, email, password, locationId, roleName, companyId } = data;

      if (!name || !email || !password || !roleName)
        return { status: false, message: "Data tidak lengkap" };

      if ((!locationId && !companyId) || (locationId && companyId)) {
        return {
          status: false,
          message:
            "Harus isi salah satu: locationId atau companyId (tidak boleh keduanya)",
        };
      }

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

      if (isUserExist) {
        return {
          status: false,
          message: "Email sudah terdaftar",
          data: null,
        };
      }

      if (locationId) {
        const isLocationExist = await masterLocation.findOne({
          where: { id: locationId },
        });

        if (!isLocationExist) {
          return {
            status: false,
            message: "Outlet tidak ditemukan",
            data: null,
          };
        }
      }

      if (companyId) {
        const isComapnyExist = await masterCompany.findOne({
          where: { id: companyId },
        });

        if (!isComapnyExist) {
          return {
            status: false,
            message: "Company tidak ditemukan",
            data: null,
          };
        }
      }

      const hashPassword = await bcrypt.hash(password, 10);

      const user = await masterUser.create({
        name: name,
        email,
        roleId: role.id,
        password: hashPassword,
        isactive: true,
      });

      if (locationId) {
        await relationshipUserLocation.create({
          userId: user.id,
          locationId: locationId,
          isactive: true,
        });
      }
      if (companyId) {
        await relationshipUserCompany.create({
          userId: user.id,
          companyId: companyId,
          isactive: true,
        });
      }

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
        subQuery: false,
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
            required: true,
            where: {
              isactive: true,
            },
            include: [
              {
                model: masterLocation,
                as: "location",
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

  async getAllUser(userObj, pagination = {}, name = null, roleCode = null) {
    try {
      const { limit, offset } = pagination;
      const where = { isactive: true };
      if (name) where.name = { [Op.like]: `%${name}%` };

      const allowedRoles = ["OUTLET_ADMIN", "OUTLET_DOCTOR"];

      if (userObj && userObj.roleCode === "SUPER_ADMIN") {
        // Super Admin can see all system roles
        allowedRoles.push(
          "SUPER_ADMIN",
          "COMPANY_ADMIN",
          "DOCTOR_GENERAL",
          "PATIENT",
        );
      } else if (userObj && userObj.roleCode === "COMPANY_ADMIN") {
        allowedRoles.push("COMPANY_ADMIN");
        // find user IDs in admin's locations
        const locIds = userObj.locationIds || [];
        const staff = await relationshipUserLocation.findAll({
          where: { locationId: { [Op.in]: locIds }, isactive: true },
          attributes: ["userId"],
          raw: true,
        });
        const allowedUserIds = staff.map((s) => s.userId);
        allowedUserIds.push(userObj.id); // allow their own account

        where.id = { [Op.in]: allowedUserIds };
      }

      const { count, rows } = await masterUser.findAndCountAll({
        where,
        attributes: ["id", "name", "email", "phone", "avatar"],
        distinct: true,
        limit,
        offset,
        subQuery: false,
        include: [
          {
            model: masterRole,
            as: "role",
            attributes: ["id", "name", "roleCode"],
            where: {
              roleCode:
                roleCode && allowedRoles.includes(roleCode)
                  ? roleCode
                  : { [Op.in]: allowedRoles },
            },
          },
          {
            model: relationshipUserLocation,
            as: "userLocations",
            required: false,
            // Hapus isactive: true di sini agar left join tetap jalan meskipun status bermasalah
            include: [
              {
                model: masterLocation,
                as: "location",
                required: false,
                include: [
                  {
                    model: masterCompany,
                    as: "company",
                    attributes: ["id", "name"],
                  },
                ],
              },
            ],
          },
          {
            model: relationshipUserCompany,
            as: "userCompanies",
            required: false,
            include: [
              {
                model: masterCompany,
                as: "company",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      });

      if (!rows || rows.length === 0) {
        return {
          status: true,
          message: "Data users tidak ditemukan",
          data: [],
          totalCount: 0,
        };
      }

      const data = rows.map((user) => {
        const locations = (user.userLocations || [])
          .map((ul) => ul.location?.name)
          .filter((name) => !!name);

        let locationName = locations.length > 0 ? locations.join(", ") : null;
        let companyName = null;

        // Prioritas Company Name: Dari lokasi dulu, fallback ke User-Company link
        if (user.userLocations && user.userLocations.length > 0) {
          companyName =
            user.userLocations.find((ul) => ul.location?.company?.name)
              ?.location?.company?.name || null;
        }

        if (
          !companyName &&
          user.userCompanies &&
          user.userCompanies.length > 0
        ) {
          companyName =
            user.userCompanies.find((uc) => uc.company?.name)?.company?.name ||
            null;
        }

        // Kalau role adalah COMPANY_ADMIN dan lokasi kosong, coba isi location dengan companyName
        if (
          !locationName &&
          user.role?.roleCode === "COMPANY_ADMIN" &&
          companyName
        ) {
          locationName = companyName;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role?.name || null,
          roleCode: user.role?.roleCode || null,
          location: locationName,
          companyName: companyName,
        };
      });

      return {
        status: true,
        message: "Success",
        data: data,
        totalCount: count,
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },

  async getAllUserCompany(userObj, pagination = {}, name = null) {
    try {
      const { limit, offset } = pagination;
      const where = { isactive: true };
      if (name) where.name = { [Op.like]: `%${name}%` };

      const allowedRoles = ["OUTLET_ADMIN", "OUTLET_DOCTOR"];

      if (userObj && userObj.roleCode === "SUPER_ADMIN") {
        allowedRoles.push(
          "SUPER_ADMIN",
          "COMPANY_ADMIN",
          "DOCTOR_GENERAL",
          "PATIENT",
        );
      } else if (userObj && userObj.roleCode === "COMPANY_ADMIN") {
        allowedRoles.push("COMPANY_ADMIN");
        const locIds = userObj.locationIds || [];
        const staff = await relationshipUserLocation.findAll({
          where: { locationId: { [Op.in]: locIds }, isactive: true },
          attributes: ["userId"],
          raw: true,
        });
        const allowedUserIds = staff.map((s) => s.userId);
        allowedUserIds.push(userObj.id);

        where.id = { [Op.in]: allowedUserIds };
      }

      const { count, rows } = await masterUser.findAndCountAll({
        where,
        attributes: ["id", "name", "email", "phone", "avatar"],
        distinct: true,
        limit,
        offset,
        subQuery: false,
        include: [
          {
            model: masterRole,
            as: "role",
            attributes: ["id", "name", "roleCode"],
            where: {
              roleCode: {
                [Op.in]: allowedRoles,
              },
            },
          },
          {
            model: relationshipUserCompany,
            as: "userCompanies",
            required: false,
            include: [
              {
                model: masterCompany,
                as: "company",
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: relationshipUserLocation,
            as: "userLocations",
            required: false,
            include: [
              {
                model: masterLocation,
                as: "location",
                required: false,
              },
            ],
          },
        ],
      });

      if (!rows || rows.length === 0) {
        return {
          status: true,
          message: "Data users tidak ditemukan",
          data: [],
          totalCount: 0,
        };
      }

      const data = rows.map((user) => {
        const locations = (user.userLocations || [])
          .map((ul) => ul.location?.name)
          .filter((name) => !!name);

        let locationName = locations.length > 0 ? locations.join(", ") : null;
        let companyName = null;

        if (user.userLocations && user.userLocations.length > 0) {
          companyName =
            user.userLocations.find((ul) => ul.location?.company?.name)
              ?.location?.company?.name || null;
        }

        if (
          !companyName &&
          user.userCompanies &&
          user.userCompanies.length > 0
        ) {
          companyName =
            user.userCompanies.find((uc) => uc.company?.name)?.company?.name ||
            null;
        }

        if (
          !locationName &&
          user.role?.roleCode === "COMPANY_ADMIN" &&
          companyName
        ) {
          locationName = companyName;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role?.name || null,
          roleCode: user.role?.roleCode || null,
          location: locationName,
          companyName: companyName,
        };
      });

      return {
        status: true,
        message: "Success",
        data: data,
        totalCount: count,
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },

  async getUserById(id) {
    try {
      let user = await masterUser.findByPk(id, {
        attributes: [
          "id",
          "name",
          "email",
          "phone",
          "avatar",
          "isactive",
          "roleId",
          "isAvailableConsul",
        ],
        include: [
          {
            model: masterRole,
            as: "role",
            attributes: ["id", "name", "roleCode"],
          },
          {
            model: relationshipUserLocation,
            as: "userLocations",
            include: [
              {
                model: masterLocation,
                as: "location",
                attributes: ["id", "name", "companyId"],
              },
            ],
          },
          {
            model: relationshipUserCompany,
            as: "userCompanies",
            include: [
              {
                model: masterCompany,
                as: "company",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      });

      if (!user) {
        return { status: false, message: "User tidak ditemukan", data: null };
      }

      // 🔥 convert ke object biasa
      user = user.toJSON();

      const isSuperAdmin = user.role?.roleCode === "SUPER_ADMIN";

      // =====================================================
      // ✅ SUPER ADMIN → semua data
      // =====================================================
      if (isSuperAdmin) {
        const allLocations = await masterLocation.findAll({
          attributes: ["id", "name", "companyId"],
        });

        const allCompanies = await masterCompany.findAll({
          attributes: ["id", "name"],
        });

        user.userLocations = allLocations.map((loc) => ({
          location: loc.toJSON ? loc.toJSON() : loc,
        }));

        user.userCompanies = allCompanies.map((comp) => ({
          company: comp.toJSON ? comp.toJSON() : comp,
        }));

        return {
          status: true,
          message: "Success",
          data: user,
        };
      }

      // =====================================================
      // 👤 USER BIASA
      // =====================================================

      const hasUserLocations =
        user.userLocations && user.userLocations.length > 0;

      const hasUserCompanies =
        user.userCompanies && user.userCompanies.length > 0;

      // =====================================================
      // PRIORITY: COMPANY → ambil semua location
      // =====================================================
      if (hasUserCompanies) {
        const companyIds = user.userCompanies.map((uc) => uc.company.id);

        const locations = await masterLocation.findAll({
          where: {
            companyId: companyIds
          },
          attributes: ["id", "name", "companyId"],
        });

        user.userLocations = locations.map((loc) => ({
          location: loc.toJSON ? loc.toJSON() : loc,
        }));

        return {
          status: true,
          message: `Success`,
          data: user,
        };
      }

      // -----------------------------------------------------
      // ✅ PRIORITY 1: pakai userLocations kalau ada
      // -----------------------------------------------------
      if (hasUserLocations) {
        return {
          status: true,
          message: "Success",
          data: user,
        };
      }
    } catch (error) {
      console.error("Get User By Id Error:", error);
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },

  async updateUser(id, data) {
    try {
      const { name, email, password, phone, roleId, locationId, isactive } =
        data;
      const user = await masterUser.findByPk(id);

      if (!user) {
        return { status: false, message: "User tidak ditemukan", data: null };
      }

      const updateData = { name, email, phone, roleId, isactive };

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      await user.update(updateData);

      if (locationId) {
        const userLocation = await relationshipUserLocation.findOne({
          where: { userId: id },
        });

        if (userLocation) {
          await userLocation.update({ locationId });
        } else {
          await relationshipUserLocation.create({
            userId: id,
            locationId,
            isactive: true,
          });
        }
      }

      return { status: true, message: "User berhasil diperbarui", data: user };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async deleteUser(id) {
    try {
      const user = await masterUser.findByPk(id);
      if (!user) {
        return { status: false, message: "User tidak ditemukan", data: null };
      }

      await user.update({ isactive: false });

      return {
        status: true,
        message: "User berhasil dinonaktifkan",
        data: null,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async resetPassword(id) {
    try {
      const user = await masterUser.findByPk(id);
      if (!user) {
        return { status: false, message: "User tidak ditemukan", data: null };
      }

      const hashedPassword = await bcrypt.hash("123456789", 10);
      await user.update({ password: hashedPassword });

      return { status: true, message: "Password berhasil direset", data: null };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async toggleAvailableConsul(id, isAvailableConsul) {
    try {
      const user = await masterUser.findByPk(id);
      if (!user) {
        return { status: false, message: "User tidak ditemukan", data: null };
      }

      await user.update({ isAvailableConsul });

      return {
        status: true,
        message: `Status konsultasi berhasil ${isAvailableConsul ? "diaktifkan" : "dinonaktifkan"}`,
        data: {
          id: user.id,
          name: user.name,
          isAvailableConsul: user.isAvailableConsul,
        },
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
