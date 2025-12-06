"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class orderCartService extends Model {
    static associate(models) {
      orderCartService.belongsTo(models.masterService, {
        foreignKey: "serviceId",
        as: "service",
        onDelete: "CASCADE",
        onUpdate: "RESTRICT",
      });

      orderCartService.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  orderCartService.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      serviceId: {
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
}
,
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "orderCartService",
      tableName: "order_cart_service",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return orderCartService;
};
