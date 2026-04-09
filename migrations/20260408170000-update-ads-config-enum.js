"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Update adsConfig table ENUM for type
    // Note: To add values to an ENUM in most SQL dialects, we just alter the column or add values.
    // In some Sequelize versions, we might need a raw query.
    await queryInterface.changeColumn("adsConfig", "type", {
      type: Sequelize.ENUM("BANNER", "CAROUSEL", "POPUP", "TOPDEALS", "PREMIUM_BADGE", "PREMIUM_SEARCH", "PREMIUM_HOME"),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // It's hard to remove enum values, but we can set it back to the original set
    await queryInterface.changeColumn("adsConfig", "type", {
      type: Sequelize.ENUM("BANNER", "CAROUSEL", "POPUP", "TOPDEALS", "PREMIUM_BADGE"),
      allowNull: false,
    });
  },
};
