"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("referralWithdrawals", "disbursementId", {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: "Xendit disbursement ID, filled after successful auto-disbursement",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("referralWithdrawals", "disbursementId");
  },
};
