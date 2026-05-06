"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Update adsConfig table ENUM for type
    await queryInterface.changeColumn("adsConfig", "type", {
      type: Sequelize.ENUM(
        "BANNER", 
        "CAROUSEL", 
        "POPUP", 
        "TOPDEALS", 
        "PREMIUM_BADGE", 
        "PREMIUM_SEARCH", 
        "PREMIUM_HOME", 
        "DESIGN_SERVICE"
      ),
      allowNull: false,
    });

    // 2. Update adsDesignRequest table ENUM for status
    await queryInterface.changeColumn("adsDesignRequest", "status", {
      type: Sequelize.ENUM(
        "REQUESTED",
        "PENDING_PAYMENT",
        "PAID",
        "PROCESSING",
        "WAITING_APPROVAL",
        "REVISION_REQUESTED",
        "COMPLETED",
        "CANCELLED"
      ),
      defaultValue: "REQUESTED",
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert adsConfig type
    await queryInterface.changeColumn("adsConfig", "type", {
      type: Sequelize.ENUM(
        "BANNER", 
        "CAROUSEL", 
        "POPUP", 
        "TOPDEALS", 
        "PREMIUM_BADGE", 
        "PREMIUM_SEARCH", 
        "PREMIUM_HOME"
      ),
      allowNull: false,
    });

    // Revert adsDesignRequest status
    await queryInterface.changeColumn("adsDesignRequest", "status", {
      type: Sequelize.ENUM(
        "REQUESTED",
        "PROCESSING",
        "WAITING_APPROVAL",
        "REVISION_REQUESTED",
        "PENDING_PAYMENT",
        "COMPLETED",
        "CANCELLED"
      ),
      defaultValue: "REQUESTED",
      allowNull: false,
    });
  },
};
