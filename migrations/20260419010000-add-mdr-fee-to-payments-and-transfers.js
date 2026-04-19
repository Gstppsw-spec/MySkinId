"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add mdrFee to orderPayment
    const tableInfo1 = await queryInterface.describeTable("orderPayment");
    if (!tableInfo1.mdrFee) {
      await queryInterface.addColumn("orderPayment", "mdrFee", {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
        allowNull: false,
      });
    }

    // 2. Add mdrFee to platformTransfers
    const tableInfo2 = await queryInterface.describeTable("platformTransfers");
    if (!tableInfo2.mdrFee) {
      await queryInterface.addColumn("platformTransfers", "mdrFee", {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
        allowNull: false,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("orderPayment", "mdrFee");
    await queryInterface.removeColumn("platformTransfers", "mdrFee");
  },
};
