"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class customerDevice extends Model {
    static associate(models) {
      customerDevice.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
      });
    }
  }

  customerDevice.init(
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
      deviceId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      platform: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "customerDevice",
      tableName: "customerDevice",
      timestamps: true,
    }
  );

  return customerDevice;
};
