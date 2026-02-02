'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("masterUser", "jwtToken");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterUser", "jwtToken", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};
