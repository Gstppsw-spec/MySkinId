"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ConsultationQuotaConfig extends Model {
    static associate(models) {}
  }

  ConsultationQuotaConfig.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      quotaPrice: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      buyThreshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      bonusQuota: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "ConsultationQuotaConfig",
      tableName: "ConsultationQuotaConfigs",
      timestamps: true,
    }
  );

  return ConsultationQuotaConfig;
};
