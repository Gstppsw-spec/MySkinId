"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class referralWithdrawal extends Model {
    static associate(models) {
      referralWithdrawal.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
      });
      referralWithdrawal.belongsTo(models.masterUser, {
        foreignKey: "processedBy",
        as: "processedByAdmin",
      });
    }
  }

  referralWithdrawal.init(
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
      bankName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      accountNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      accountName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "COMPLETED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      adminNote: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      processedBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      disbursementId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Xendit disbursement ID, filled after successful auto-disbursement",
      },
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "referralWithdrawal",
      tableName: "referralWithdrawals",
      timestamps: true,
    }
  );

  return referralWithdrawal;
};
