"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterUser", "isAvailableConsul", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("masterUser", "isAvailableConsul");
  },
};
