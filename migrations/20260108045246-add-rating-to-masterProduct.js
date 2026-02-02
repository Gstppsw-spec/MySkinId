"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterProduct", "ratingAvg", {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("masterProduct", "ratingCount", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("masterProduct", "ratingAvg");
    await queryInterface.removeColumn("masterProduct", "ratingCount");
  },
};
