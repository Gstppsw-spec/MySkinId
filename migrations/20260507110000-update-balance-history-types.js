"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // MySQL doesn't support changing ENUM values easily via changeColumn without potentially losing data or complex steps.
    // However, since Sequelize Migrations on MySQL usually handle this by modifying the column definition:
    await queryInterface.changeColumn("companyAdsBalanceHistory", "type", {
      type: Sequelize.ENUM("TOPUP", "SPEND", "INITIAL_GRANT", "VOUCHER_SUBSIDY", "WITHDRAWAL"),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("companyAdsBalanceHistory", "type", {
      type: Sequelize.ENUM("TOPUP", "SPEND", "INITIAL_GRANT"),
      allowNull: false,
    });
  },
};
