"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class referralPoints extends Model {
    static associate(models) {
      referralPoints.belongsTo(models.masterCustomer, {
        foreignKey: "referrerId",
        as: "referrer",
      });
      referralPoints.belongsTo(models.masterCustomer, {
        foreignKey: "referredCustomerId",
        as: "referredCustomer",
      });
      referralPoints.belongsTo(models.order, {
        foreignKey: "orderId",
        as: "order",
      });
      referralPoints.belongsTo(models.transaction, {
        foreignKey: "transactionId",
        as: "transaction",
      });
    }
  }

  referralPoints.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      referrerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      referredCustomerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      transactionId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      transactionAmount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      commissionRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      pointsEarned: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      isFirstTransaction: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM("PENDING", "CREDITED", "CANCELLED"),
        allowNull: false,
        defaultValue: "CREDITED",
      },
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "referralPoints",
      tableName: "referralPoints",
      timestamps: true,
    }
  );

  return referralPoints;
};
