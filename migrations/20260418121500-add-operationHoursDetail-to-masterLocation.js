"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("masterLocation", "operationHoursDetail", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "operationDays",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("masterLocation", "operationHoursDetail");
  },
};
