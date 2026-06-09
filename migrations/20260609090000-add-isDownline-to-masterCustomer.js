"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterCustomer", "isDownline", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Ditandai oleh superadmin, status partner downline",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("masterCustomer", "isDownline");
  },
};
