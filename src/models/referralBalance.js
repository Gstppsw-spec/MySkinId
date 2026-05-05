"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class referralBalance extends Model {
    static associate(models) {
      referralBalance.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
      });
    }
  }

  referralBalance.init(
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
        unique: true,
      },
      balance: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalEarned: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalWithdrawn: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "referralBalance",
      tableName: "referralBalance",
      timestamps: true,
    }
  );

  return referralBalance;
};
