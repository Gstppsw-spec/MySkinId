"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterConsultationCategory extends Model {
    static associate(models) {
      masterConsultationCategory.belongsToMany(models.masterProduct, {
        through: "relationshipProductConsultationCategory",
        foreignKey: "consultationCategoryId",
        otherKey: "productId",
        as: "products",
      });

      masterConsultationCategory.belongsToMany(
        models.masterQuestionnaire,
        {
          through: "relationshipQuestionnaireCategoryConsultation",
          foreignKey: "consultationCategoryId",
          otherKey: "questionnaireId",
          as: "questionnaires",
        },
      );

      masterConsultationCategory.belongsToMany(models.masterPackage, {
        through: "relationshipPackageConsultationCategory",
        foreignKey: "consultationCategoryId",
        otherKey: "packageId",
        as: "packages",
      });

      masterConsultationCategory.belongsToMany(
        models.consultationRecommendation,
        {
          through: "consultationRecommendationCategory",
          foreignKey: "consultationCategoryId",
          otherKey: "recommendationId",
          as: "recommendations",
        }
      );
    }
  }

  masterConsultationCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      iconUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "URL atau path icon kategori",
        get() {
          const rawValue = this.getDataValue("iconUrl");
          if (!rawValue) return null;
          const BASE_URL =
            process.env.BASE_URL ||
            `${process.env.APP_PROTOCOL || "http"}://${process.env.APP_HOST || "localhost"
            }:${process.env.APP_PORT || 3000}`;

          return `${BASE_URL}/${rawValue}`;
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "masterConsultationCategory",
      tableName: "masterConsultationCategory",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  );

  return masterConsultationCategory;
};
