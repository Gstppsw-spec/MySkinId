"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class VoucherItem extends Model {
    static associate(models) {
      VoucherItem.belongsTo(models.Voucher, {
        foreignKey: "voucherId",
        as: "voucher",
      });
      // Polymorphic: itemType + itemId → product, package, or service
      VoucherItem.belongsTo(models.masterProduct, {
        foreignKey: "itemId",
        as: "product",
        constraints: false,
      });
      VoucherItem.belongsTo(models.masterPackage, {
        foreignKey: "itemId",
        as: "package",
        constraints: false,
      });
      VoucherItem.belongsTo(models.masterService, {
        foreignKey: "itemId",
        as: "service",
        constraints: false,
      });
    }
  }

  VoucherItem.init(
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
      itemType: {
        type: DataTypes.ENUM("PRODUCT", "PACKAGE", "SERVICE"),
        allowNull: false,
      },
      itemId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "VoucherItem",
      tableName: "voucherItems",
      timestamps: true,
    }
  );

  return VoucherItem;
};
