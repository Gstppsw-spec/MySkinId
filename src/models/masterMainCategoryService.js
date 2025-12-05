"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterMainCategoryService extends Model {
    static associate(models) {
      masterMainCategoryService.hasMany(models.masterSubCategoryService, {
        foreignKey: "mainCategoryServiceId",
        as: "subServiceCategory",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  masterMainCategoryService.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "masterMainCategoryService",
      tableName: "masterMainCategoryService",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return masterMainCategoryService;
};
