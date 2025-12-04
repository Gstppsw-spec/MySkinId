"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterProductCategory extends Model {
    static associate(models) {
      masterProductCategory.belongsToMany(models.masterProduct, {
        through: "relationshipProductCategory",
        foreignKey: "productCategoryId",
        otherKey: "productId",
        as: "products",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  masterProductCategory.init(
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
      modelName: "masterProductCategory",
      tableName: "masterProductCategory",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return masterProductCategory;
};
