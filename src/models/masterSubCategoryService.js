"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterSubCategoryService extends Model {
    static associate(models) {
      masterSubCategoryService.belongsTo(models.masterMainCategoryService, {
        foreignKey: "mainCategoryServiceId",
        as: "mainCategoryService",
      });
    }
  }

  masterSubCategoryService.init(
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
      mainCategoryServiceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "masterMainCategoryService",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
    {
      sequelize,
      modelName: "masterSubCategoryService",
      tableName: "masterSubCategoryService",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return masterSubCategoryService;
};
