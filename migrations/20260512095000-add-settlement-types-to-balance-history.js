"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("companyAdsBalanceHistory", "type", {
      type: Sequelize.ENUM("TOPUP", "SPEND", "INITIAL_GRANT", "VOUCHER_SUBSIDY", "WITHDRAWAL", "PRODUCT_SETTLEMENT", "VOUCHER_SETTLEMENT"),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("companyAdsBalanceHistory", "type", {
      type: Sequelize.ENUM("TOPUP", "SPEND", "INITIAL_GRANT", "VOUCHER_SUBSIDY", "WITHDRAWAL"),
      allowNull: false,
    });
  },
};
