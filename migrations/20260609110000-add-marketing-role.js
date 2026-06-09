"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM masterRole WHERE roleCode = 'MARKETING' LIMIT 1;`
    );
    if (!existing || existing.length === 0) {
      await queryInterface.bulkInsert("masterRole", [
        {
          id: uuidv4(),
          name: "Marketing",
          roleCode: "MARKETING",
          description: "Role marketing untuk mengelola notifikasi dan flash sale",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("masterRole", { roleCode: "MARKETING" }, {});
  },
};
