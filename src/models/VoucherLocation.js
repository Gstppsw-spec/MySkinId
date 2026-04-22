"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class VoucherLocation extends Model {
    static associate(models) {
      VoucherLocation.belongsTo(models.Voucher, {
        foreignKey: "voucherId",
        as: "voucher",
      });
      VoucherLocation.belongsTo(models.masterLocation, {
        foreignKey: "locationId",
        as: "location",
      });
    }
  }

  VoucherLocation.init(
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
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "VoucherLocation",
      tableName: "voucherLocations",
      timestamps: true,
    }
  );

  return VoucherLocation;
};
