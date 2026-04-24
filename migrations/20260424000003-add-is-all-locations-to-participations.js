"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("voucherParticipations", "isAllLocations", {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("voucherParticipations", "isAllLocations");
  },
};
