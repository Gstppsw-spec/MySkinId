"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class orderCartProduct extends Model {
    static associate(models) {
      orderCartProduct.belongsTo(models.masterProduct, {
        foreignKey: "productId",
        as: "product",
        onDelete: "CASCADE",
        onUpdate: "RESTRICT",
      });

      orderCartProduct.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  orderCartProduct.init(
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
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      isSelected: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "orderCartProduct",
      tableName: "order_cart_product",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return orderCartProduct;
};
