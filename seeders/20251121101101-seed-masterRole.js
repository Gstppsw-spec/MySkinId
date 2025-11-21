"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("masterRole", [
      {
        id: uuidv4(),
        name: "Super Admin",
        roleCode: "SUPER_ADMIN",
        description: "Admin pusat sistem",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: "Admin Perusahaan",
        roleCode: "COMPANY_ADMIN",
        description: "Admin untuk perusahaan",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: "Admin Shop/Outlet",
        roleCode: "OUTLET_ADMIN",
        description: "Admin untuk perusahaan",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: "Dokter Konsultasi",
        roleCode: "DOCTOR",
        description:
          "Role dokter yang bertanggung jawab untuk urusan konsultasi",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("masterRole", null, {});
  },
};
