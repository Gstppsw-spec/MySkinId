"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("companyAdsBalance");
    if (!tableInfo.nonWithdrawableBalance) {
      await queryInterface.addColumn("companyAdsBalance", "nonWithdrawableBalance", {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
        after: "balance",
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("companyAdsBalance", "nonWithdrawableBalance");
  },
};
