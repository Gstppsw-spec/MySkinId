"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AdsConfig extends Model {
    static associate(models) {
      AdsConfig.hasMany(models.AdsPurchase, {
        foreignKey: "configId",
        as: "purchases",
      });
    }
  }

  AdsConfig.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      type: {
        type: DataTypes.ENUM("BANNER", "CAROUSEL", "POPUP", "TOPDEALS", "PREMIUM_BADGE", "PREMIUM_SEARCH", "PREMIUM_HOME"),
        allowNull: false,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      slideNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      pricePerDay: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      maxSlots: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "AdsConfig",
      tableName: "adsConfig",
      timestamps: true,
    }
  );

  return AdsConfig;
};
