"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterPackage", "ratingAvg", {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("masterPackage", "ratingCount", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("masterPackage", "ratingAvg");
    await queryInterface.removeColumn("masterPackage", "ratingCount");
  },
};
