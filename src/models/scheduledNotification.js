"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class scheduledNotification extends Model {
    static associate(models) {
      scheduledNotification.belongsTo(models.flashSale, {
        foreignKey: "flashSaleId",
        as: "flashSale",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  scheduledNotification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      flashSaleId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      clickRoute: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      target: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "ALL",
      },
      status: {
        type: DataTypes.ENUM("PENDING", "SENT", "FAILED", "ACTIVE"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      repeatDaily: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lastSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "scheduledNotification",
      tableName: "scheduledNotification",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return scheduledNotification;
};
