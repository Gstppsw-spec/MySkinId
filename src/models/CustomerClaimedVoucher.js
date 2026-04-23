"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CustomerClaimedVoucher extends Model {
    static associate(models) {
      CustomerClaimedVoucher.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
      });
      CustomerClaimedVoucher.belongsTo(models.Voucher, {
        foreignKey: "voucherId",
        as: "voucher",
      });
    }
  }

  CustomerClaimedVoucher.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      voucherId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("CLAIMED", "USED", "EXPIRED"),
        allowNull: false,
        defaultValue: "CLAIMED",
      },
      claimedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CustomerClaimedVoucher",
      tableName: "customerClaimedVouchers",
      timestamps: true,
    }
  );

  return CustomerClaimedVoucher;
};
