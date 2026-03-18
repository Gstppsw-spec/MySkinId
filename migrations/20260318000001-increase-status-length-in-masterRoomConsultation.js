"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("masterRoomConsultation", "status", {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "pending",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("masterRoomConsultation", "status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    });
  },
};
