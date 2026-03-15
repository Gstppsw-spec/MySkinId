"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class consultationRecommendationCategory extends Model {
    static associate(models) {
      // pivot table – relasi di-handle belongsToMany di consultationRecommendation & masterConsultationCategory
    }
  }

  consultationRecommendationCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      recommendationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      consultationCategoryId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "consultationRecommendationCategory",
      tableName: "consultationRecommendationCategory",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return consultationRecommendationCategory;
};
