"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterService", "ratingAvg", {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("masterService", "ratingCount", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("masterService", "ratingAvg");
    await queryInterface.removeColumn("masterService", "ratingCount");
  },
};
