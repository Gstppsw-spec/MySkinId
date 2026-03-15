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
        models.masterConsultationCategory,
        {
          through: "consultationRecommendationCategory",
          foreignKey: "recommendationId",
          otherKey: "consultationCategoryId",
          as: "categories",
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
