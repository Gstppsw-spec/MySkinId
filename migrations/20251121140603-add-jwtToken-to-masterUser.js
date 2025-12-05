"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterUser", "jwtToken", {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: "Stores the last generated JWT token (optional)"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("masterUser", "jwtToken");
  }
};
