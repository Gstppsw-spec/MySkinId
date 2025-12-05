"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class relationshipGroupProduct extends Model {
    static associate(models) {
      // biasanya pivot table tidak butuh associate lagi karena sudah dihandle belongsToMany
    }
  }

  relationshipGroupProduct.init(
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
      groupId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "relationshipGroupProduct",
      tableName: "relationshipGroupProduct",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return relationshipGroupProduct;
};
