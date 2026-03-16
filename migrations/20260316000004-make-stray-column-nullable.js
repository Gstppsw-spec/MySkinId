"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("consultationRecommendationCategory");
    
    // Drop the extra column if it exists, as it's not part of the standard schema
    if (tableInfo.consultationCategoryId) {
      await queryInterface.removeColumn("consultationRecommendationCategory", "consultationCategoryId");
    }
  },

  async down(queryInterface) {
    // No action needed for down
  },
};
