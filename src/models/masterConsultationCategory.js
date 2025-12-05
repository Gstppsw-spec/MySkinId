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
    }
  );

  return masterConsultationCategory;
};
