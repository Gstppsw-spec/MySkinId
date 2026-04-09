"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyAdsBalance extends Model {
    static associate(models) {
      CompanyAdsBalance.belongsTo(models.masterCompany, {
        foreignKey: "companyId",
        as: "company",
      });
      CompanyAdsBalance.hasMany(models.CompanyAdsBalanceHistory, {
        foreignKey: "balanceId",
        as: "history",
      });
    }
  }

  CompanyAdsBalance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      balance: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      lastTopupAt: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: "CompanyAdsBalance",
      tableName: "companyAdsBalance",
      timestamps: true,
    }
  );

  return CompanyAdsBalance;
};
