"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class relationshipProductCategory extends Model {
    static associate(models) {
      // biasanya pivot table tidak butuh associate lagi karena sudah dihandle belongsToMany
    }
  }

  relationshipProductCategory.init(
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
      productCategoryId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "relationshipProductCategory",
      tableName: "relationshipProductCategory",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return relationshipProductCategory;
};
