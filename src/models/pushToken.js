"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class pushToken extends Model {
    static associate(models) {
      pushToken.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
      });
      pushToken.belongsTo(models.masterUser, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }

  pushToken.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      deviceId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "pushToken",
      tableName: "pushToken",
      timestamps: true,
    }
  );

  return pushToken;
};
