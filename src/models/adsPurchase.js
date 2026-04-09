"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AdsPurchase extends Model {
    static associate(models) {
      AdsPurchase.belongsTo(models.masterLocation, {
        foreignKey: "locationId",
        as: "location",
      });
      AdsPurchase.belongsTo(models.order, {
        foreignKey: "orderId",
        as: "order",
      });
      AdsPurchase.belongsTo(models.AdsConfig, {
        foreignKey: "configId",
        as: "config",
      });
    }
  }

  AdsPurchase.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      adsType: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      configId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      data: {
        type: DataTypes.TEXT,
        get() {
          const rawValue = this.getDataValue("data");
          return rawValue ? JSON.parse(rawValue) : null;
        },
        set(value) {
          this.setDataValue("data", value ? JSON.stringify(value) : null);
        },
      },
      status: {
        type: DataTypes.ENUM("PENDING", "PAID", "EXPIRED", "CANCELLED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      referenceType: {
        type: DataTypes.ENUM("OUTLET", "PRODUCT", "PACKAGE", "SERVICE", "EXTERNAL"),
        allowNull: true,
        defaultValue: "OUTLET"
      },
      referenceId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "AdsPurchase",
      tableName: "adsPurchase",
      timestamps: true,
    }
  );

  return AdsPurchase;
};
