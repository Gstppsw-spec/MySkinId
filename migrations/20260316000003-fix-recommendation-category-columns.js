"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("consultationRecommendationCategory");
    
    if (!tableInfo.productCategoryId) {
      await queryInterface.addColumn("consultationRecommendationCategory", "productCategoryId", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "masterProductCategory",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
    
    if (!tableInfo.packageCategoryId) {
      await queryInterface.addColumn("consultationRecommendationCategory", "packageCategoryId", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "masterSubCategoryService",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  },

  async down(queryInterface) {
    // Standard practice is to not remove columns if they might have data, 
    // but for symmetry:
    // await queryInterface.removeColumn("consultationRecommendationCategory", "productCategoryId");
    // await queryInterface.removeColumn("consultationRecommendationCategory", "packageCategoryId");
  },
};
