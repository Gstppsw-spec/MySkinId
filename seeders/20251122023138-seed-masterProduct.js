"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    await queryInterface.bulkInsert("masterProduct", [
      {
        id: uuidv4(),
        name: "Hydrating Serum",
        sku: "PRD-001",
        description: "Serum untuk melembapkan kulit wajah",
        price: 250000.0,
        discountPercent: 10.0,
        isPrescriptionRequired: false,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        name: "Vitamin C Toner",
        sku: "PRD-002",
        description: "Toner wajah dengan kandungan Vitamin C",
        price: 150000.0,
        discountPercent: 0.0,
        isPrescriptionRequired: false,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        name: "Clay Face Mask",
        sku: "PRD-003",
        description: "Masker wajah berbahan clay untuk membersihkan pori",
        price: 180000.0,
        discountPercent: 5.0,
        isPrescriptionRequired: false,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        name: "Retinol Cream",
        sku: "PRD-004",
        description: "Krim wajah dengan Retinol, perlu resep dokter",
        price: 320000.0,
        discountPercent: 0.0,
        isPrescriptionRequired: true,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        name: "Sunscreen SPF 50",
        sku: "PRD-005",
        description: "Tabir surya untuk melindungi kulit dari sinar UV",
        price: 200000.0,
        discountPercent: 15.0,
        isPrescriptionRequired: false,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("masterProduct", null, {});
  },
};
