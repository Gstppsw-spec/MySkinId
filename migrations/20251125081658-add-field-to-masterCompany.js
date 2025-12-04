"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterCompany", "isVerified", {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    });

    await queryInterface.addColumn("masterCompany", "verifiedDate", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("masterCompany", "isVerified");
    await queryInterface.removeColumn("masterCompany", "verifiedDate");
  },
};
