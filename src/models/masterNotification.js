"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterNotification extends Model {
    static associate(models) {
      masterNotification.belongsTo(models.masterCompany, {
        foreignKey: "companyId",
        as: "company",
      });

      masterNotification.belongsTo(models.masterUser, {
        foreignKey: "userId",
        as: "user",
      });

      masterNotification.belongsTo(models.masterLocation, {
        foreignKey: "locationId",
        as: "location",
      });
    }
  }

  masterNotification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      userId: {
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
      category: {
        type: DataTypes.ENUM(
          "Verification",
          "Consultation",
          "Transaction",
          "Promotion",
          "System"
        ),
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      referenceId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      referenceType: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "masterNotification",
      tableName: "masterNotification",
      timestamps: true,
    }
  );

  return masterNotification;
};
