'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("masterCustomer", "jwtToken");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterCustomer", "jwtToken", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  }
};
