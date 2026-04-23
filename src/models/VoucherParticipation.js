"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class VoucherParticipation extends Model {
    static associate(models) {
      VoucherParticipation.belongsTo(models.Voucher, {
        foreignKey: "voucherId",
        as: "voucher",
      });
      VoucherParticipation.belongsTo(models.masterCompany, {
        foreignKey: "companyId",
        as: "company",
      });
      VoucherParticipation.hasMany(models.VoucherParticipationItem, {
        foreignKey: "participationId",
        as: "items",
        onDelete: "CASCADE",
      });
    }
  }

  VoucherParticipation.init(
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
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
        defaultValue: "ACTIVE",
        allowNull: false,
      },
      isAllItems: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "VoucherParticipation",
      tableName: "voucherParticipations",
      timestamps: true,
    }
  );

  return VoucherParticipation;
};
