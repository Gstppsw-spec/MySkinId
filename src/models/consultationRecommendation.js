"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class consultationRecommendation extends Model {
    static associate(models) {
      consultationRecommendation.belongsTo(models.masterRoomConsultation, {
        foreignKey: "roomId",
        as: "room",
      });

      consultationRecommendation.belongsToMany(
        models.masterProductCategory,
        {
          through: "consultationRecommendationCategory",
          foreignKey: "recommendationId",
          otherKey: "productCategoryId",
          as: "productCategories",
        }
      );

      consultationRecommendation.belongsToMany(
        models.masterSubCategoryService,
        {
          through: "consultationRecommendationCategory",
          foreignKey: "recommendationId",
          otherKey: "packageCategoryId",
          as: "packageCategories",
        }
      );
    }
  }

  consultationRecommendation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      roomId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "consultationRecommendation",
      tableName: "consultationRecommendation",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return consultationRecommendation;
};
