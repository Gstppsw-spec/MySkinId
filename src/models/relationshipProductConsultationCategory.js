"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class relationshipProductConsultationCategory extends Model {
    static associate(models) {
      // biasanya pivot table tidak perlu associate lagi karena sudah di-handle belongsToMany
    }
  }

  relationshipProductConsultationCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
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
      modelName: "relationshipProductConsultationCategory",
      tableName: "relationshipProductConsultationCategory",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return relationshipProductConsultationCategory;
};
