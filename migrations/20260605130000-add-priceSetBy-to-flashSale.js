"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("flashSale", "priceSetBy", {
      type: Sequelize.ENUM("SUPER_ADMIN", "MITRA"),
      allowNull: false,
      defaultValue: "SUPER_ADMIN",
      after: "status",
    });

    await queryInterface.addColumn("flashSale", "flashPrice", {
      type: Sequelize.DECIMAL(18, 2),
      allowNull: true,
      defaultValue: null,
      after: "priceSetBy",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("flashSale", "flashPrice");
    await queryInterface.removeColumn("flashSale", "priceSetBy");
  },
};
