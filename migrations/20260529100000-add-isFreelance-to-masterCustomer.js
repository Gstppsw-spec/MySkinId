"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterCustomer", "isFreelance", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Ditandai oleh superadmin, freelance/busdev tidak dapat komisi referral",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("masterCustomer", "isFreelance");
  },
};
