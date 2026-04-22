"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Voucher extends Model {
    static associate(models) {
      Voucher.hasMany(models.VoucherItem, {
        foreignKey: "voucherId",
        as: "items",
        onDelete: "CASCADE",
      });
      Voucher.hasMany(models.VoucherUsage, {
        foreignKey: "voucherId",
        as: "usages",
      });
      Voucher.belongsTo(models.masterCompany, {
        foreignKey: "companyId",
        as: "company",
      });
      Voucher.belongsTo(models.masterUser, {
        foreignKey: "createdById",
        as: "creator",
      });
      Voucher.hasMany(models.VoucherLocation, {
        foreignKey: "voucherId",
        as: "locations",
        onDelete: "CASCADE",
      });
    }
  }

  Voucher.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      discountType: {
        type: DataTypes.ENUM("PERCENTAGE", "FIXED"),
        allowNull: false,
      },
      discountValue: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
      },
      minPurchase: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      maxDiscount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },
      quota: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      usedCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      perUserLimit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE", "EXPIRED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      createdByType: {
        type: DataTypes.ENUM("SUPER_ADMIN", "COMPANY_ADMIN"),
        allowNull: false,
      },
      createdById: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      myskinSharePercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      mitraSharePercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 100,
      },
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "Voucher",
      tableName: "vouchers",
      timestamps: true,
    }
  );

  return Voucher;
};
