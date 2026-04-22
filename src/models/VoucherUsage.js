"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class VoucherUsage extends Model {
    static associate(models) {
      VoucherUsage.belongsTo(models.Voucher, {
        foreignKey: "voucherId",
        as: "voucher",
      });
      VoucherUsage.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
      });
      VoucherUsage.belongsTo(models.order, {
        foreignKey: "orderId",
        as: "order",
      });
    }
  }

  VoucherUsage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      voucherId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      discountAmount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      myskinSubsidy: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      mitraSubsidy: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "VoucherUsage",
      tableName: "voucherUsages",
      timestamps: true,
    }
  );

  return VoucherUsage;
};
