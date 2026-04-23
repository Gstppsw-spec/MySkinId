"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class VoucherParticipationItem extends Model {
    static associate(models) {
      VoucherParticipationItem.belongsTo(models.VoucherParticipation, {
        foreignKey: "participationId",
        as: "participation",
      });
    }
  }

  VoucherParticipationItem.init(
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
      itemType: {
        type: DataTypes.ENUM("PRODUCT", "PACKAGE", "SERVICE"),
        allowNull: false,
      },
      itemId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "VoucherParticipationItem",
      tableName: "voucherParticipationItems",
      timestamps: true,
    }
  );

  return VoucherParticipationItem;
};
