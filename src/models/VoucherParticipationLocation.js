"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class VoucherParticipationLocation extends Model {
    static associate(models) {
      VoucherParticipationLocation.belongsTo(models.VoucherParticipation, {
        foreignKey: "participationId",
        as: "participation",
      });
      VoucherParticipationLocation.belongsTo(models.masterLocation, {
        foreignKey: "locationId",
        as: "location",
      });
    }
  }

  VoucherParticipationLocation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      participationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "VoucherParticipationLocation",
      tableName: "voucherParticipationLocations",
      timestamps: true,
    }
  );

  return VoucherParticipationLocation;
};
