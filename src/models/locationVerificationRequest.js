"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LocationVerificationRequest extends Model {
    static associate(models) {
      LocationVerificationRequest.belongsTo(models.masterLocation, {
        foreignKey: "locationId",
        as: "location",
      });
    }
  }

  LocationVerificationRequest.init(
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
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "pending",
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "LocationVerificationRequest",
      tableName: "locationVerificationRequest",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return LocationVerificationRequest;
};
