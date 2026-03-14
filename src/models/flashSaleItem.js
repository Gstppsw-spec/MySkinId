"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class flashSaleItem extends Model {
    static associate(models) {
      flashSaleItem.belongsTo(models.flashSale, {
        foreignKey: "flashSaleId",
        as: "flashSale",
      });

      flashSaleItem.belongsTo(models.masterProduct, {
        foreignKey: "productId",
        as: "product",
      });
    }
  }

  flashSaleItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      flashSaleId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      flashPrice: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "flashSaleItem",
      tableName: "flashSaleItem",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return flashSaleItem;
};
