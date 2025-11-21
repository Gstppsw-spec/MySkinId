"use strict";

const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const [roles] = await queryInterface.sequelize.query(`
      SELECT id FROM masterRole WHERE roleCode = 'SUPER_ADMIN' LIMIT 1
    `);

    if (!roles || roles.length === 0) {
      throw new Error(
        "Role SUPER_ADMIN belum tersedia. Jalankan seeder role dulu."
      );
    }

    const roleId = roles[0].id;

    const hashedPassword = bcrypt.hashSync("12345678!", 10);

    await queryInterface.bulkInsert("masterUser", [
      {
        id: uuidv4(),
        name: "Super Administrator",
        email: "superadmin@system.com",
        phone: "081234567890",
        password: hashedPassword,
        roleId: roleId,
        isactive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("masterUser", {
      email: "superadmin@system.com",
    });
  },
};
