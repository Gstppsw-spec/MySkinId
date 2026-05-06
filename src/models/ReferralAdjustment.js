"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReferralAdjustment extends Model {
    static associate(models) {
      ReferralAdjustment.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
      });
      ReferralAdjustment.belongsTo(models.masterUser, {
        foreignKey: "adjustedBy",
        as: "admin",
      });
    }
  }

  ReferralAdjustment.init(
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
      amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("ADD", "SUBTRACT"),
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      adjustedBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "ReferralAdjustment",
      tableName: "ReferralAdjustments",
      timestamps: true,
    }
  );

  return ReferralAdjustment;
};
