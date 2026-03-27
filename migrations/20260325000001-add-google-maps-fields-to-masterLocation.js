"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterLocation", "googlePlaceId", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn("masterLocation", "googleRating", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn("masterLocation", "googleRatingCount", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn("masterLocation", "googleRatingSyncedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("masterLocation", "googlePlaceId");
    await queryInterface.removeColumn("masterLocation", "googleRating");
    await queryInterface.removeColumn("masterLocation", "googleRatingCount");
    await queryInterface.removeColumn("masterLocation", "googleRatingSyncedAt");
  },
};
