"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterLocation", "isVerified", {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    });

    await queryInterface.addColumn("masterLocation", "verifiedDate", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("masterLocation", "isVerified");
    await queryInterface.removeColumn("masterLocation", "verifiedDate");
  },
};
