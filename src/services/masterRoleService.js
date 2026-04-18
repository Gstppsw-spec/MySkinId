const { masterRole } = require("../models");

class MasterRoleService {
    async create(data) {
        try {
            const { name, roleCode, description } = data;

            const checkRole = await masterRole.findOne({
                where: { roleCode },
            });

            if (checkRole) {
                return {
                    status: false,
                    message: "Role Code sudah digunakan",
                    data: null,
                };
            }

            const result = await masterRole.create({
                name,
                roleCode,
                description,
            });

            return { status: true, message: "Role berhasil dibuat", data: result };
        } catch (error) {
            return { status: false, message: error.message };
        }
    }

    async list(user) {
        try {
            const { Op } = require("sequelize");
            const where = {};
            
            if (user && user.roleCode === "COMPANY_ADMIN") {
                where.roleCode = { [Op.in]: ["OUTLET_DOCTOR", "OUTLET_ADMIN"] };
            }
            // OPERATIONAL_ADMIN can see all roles, including SUPER_ADMIN

            const roles = await masterRole.findAll({
                where,
                order: [["createdAt", "DESC"]],
            });

            return {
                status: true,
                message: "List Master Role",
                data: roles,
            };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    }

    async detail(id, user) {
        try {
            const role = await masterRole.findByPk(id);

            if (!role) {
                return {
                    status: false,
                    message: "Role tidak ditemukan",
                    data: null,
                };
            }

            // Filtering for COMPANY_ADMIN
            if (user && user.roleCode === "COMPANY_ADMIN") {
                const allowedRoles = ["OUTLET_DOCTOR", "OUTLET_ADMIN"];
                if (!allowedRoles.includes(role.roleCode)) {
                    return {
                        status: false,
                        message: "Role tidak ditemukan", // Consistent with list filtering
                        data: null,
                    };
                }
            }

            return { status: true, message: "Role ditemukan", data: role };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    }

    async update(id, data) {
        try {
            const role = await masterRole.findByPk(id);

            if (!role) {
                return {
                    status: false,
                    message: "Role tidak ditemukan",
                    data: null,
                };
            }

            if (data.roleCode && data.roleCode !== role.roleCode) {
                const checkRole = await masterRole.findOne({
                    where: { roleCode: data.roleCode },
                });

                if (checkRole) {
                    return {
                        status: false,
                        message: "Role Code sudah digunakan",
                        data: null,
                    };
                }
            }

            await role.update(data);

            return { status: true, message: "Role berhasil diperbarui", data: role };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    }

    async delete(id) {
        try {
            const role = await masterRole.findByPk(id);

            if (!role) {
                return {
                    status: false,
                    message: "Role tidak ditemukan",
                    data: null,
                };
            }

            await role.destroy();

            return { status: true, message: "Role berhasil dihapus", data: null };
        } catch (error) {
            return { status: false, message: error.message, data: null };
        }
    }
}

module.exports = new MasterRoleService();