"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    await queryInterface.bulkInsert("masterProductCategory", [
      {
        id: uuidv4(),
        name: "Serum",
        description: "Produk serum untuk perawatan kulit",
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        name: "Toner",
        description: "Produk toner untuk membersihkan dan menyeimbangkan kulit",
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        name: "Masker",
        description: "Produk masker wajah dan tubuh",
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        name: "Moisturizer",
        description: "Produk pelembap kulit",
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        name: "Sunscreen",
        description: "Produk pelindung kulit dari sinar UV",
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("masterProductCategory", null, {});
  },
};
