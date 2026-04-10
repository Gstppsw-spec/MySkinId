"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("transactions", "locationId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("transactions", "locationId", {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },
};
