"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "masterGroupProduct",
      [
        {
          id: uuidv4(),
          name: "Skincare",
          description: "Produk perawatan kulit",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          name: "Body Care",
          description: "Produk perawatan tubuh",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          name: "Supplement",
          description: "Produk suplemen kesehatan",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          name: "Makeup",
          description: "Produk rias wajah",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("masterGroupProduct", null, {});
  },
};
