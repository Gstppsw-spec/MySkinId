"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterGroupProduct extends Model {
    static associate(models) {
      masterGroupProduct.belongsToMany(models.masterProduct, {
        through: "relationshipGroupProduct",
        foreignKey: "groupId",
        otherKey: "productId",
        as: "products",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  masterGroupProduct.init(
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
      modelName: "masterGroupProduct",
      tableName: "masterGroupProduct",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return masterGroupProduct;
};
