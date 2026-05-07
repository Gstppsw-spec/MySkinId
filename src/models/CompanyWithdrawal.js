"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyWithdrawal extends Model {
    static associate(models) {
      CompanyWithdrawal.belongsTo(models.masterCompany, {
        foreignKey: "companyId",
        as: "company",
      });
    }
  }

  CompanyWithdrawal.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
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
    },
    {
      sequelize,
      modelName: "CompanyWithdrawal",
      tableName: "companyWithdrawals",
      timestamps: true,
    }
  );

  return CompanyWithdrawal;
};
