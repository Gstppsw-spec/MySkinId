"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyAdsBalanceHistory extends Model {
    static associate(models) {
      CompanyAdsBalanceHistory.belongsTo(models.CompanyAdsBalance, {
        foreignKey: "balanceId",
        as: "balanceDetails",
      });
    }
  }

  CompanyAdsBalanceHistory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      balanceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("TOPUP", "SPEND", "INITIAL_GRANT"),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
      },
      referenceId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CompanyAdsBalanceHistory",
      tableName: "companyAdsBalanceHistory",
      timestamps: true,
    }
  );

  return CompanyAdsBalanceHistory;
};
