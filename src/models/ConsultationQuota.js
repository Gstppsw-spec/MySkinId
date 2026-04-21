"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ConsultationQuota extends Model {
    static associate(models) {
      ConsultationQuota.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
      });
    }
  }

  ConsultationQuota.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      purchasedBalance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lastFreeQuotaUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ConsultationQuota",
      tableName: "ConsultationQuotas",
      timestamps: true,
    }
  );

  return ConsultationQuota;
};
