"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class platformWithdrawal extends Model {
    static associate(models) {
      platformWithdrawal.belongsTo(models.masterUser, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }

  platformWithdrawal.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
      },
      bankName: DataTypes.STRING(100),
      bankAccountName: DataTypes.STRING(100),
      bankAccountNumber: DataTypes.STRING(50),
      status: {
        type: DataTypes.ENUM("PENDING", "SUCCESS", "FAILED"),
        defaultValue: "PENDING",
      },
      xenditId: DataTypes.STRING(100),
      errorMessage: DataTypes.TEXT,
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "platformWithdrawal",
      tableName: "platformWithdrawals",
      timestamps: true,
    }
  );

  return platformWithdrawal;
};
