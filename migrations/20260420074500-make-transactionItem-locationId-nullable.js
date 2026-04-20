"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("transactionItems", "locationId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("transactionItems", "locationId", {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
