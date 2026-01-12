"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class customerCart extends Model {
    static associate(models) {
      customerCart.belongsTo(models.masterProduct, {
        foreignKey: "refferenceId",
        as: "product",
        onDelete: "CASCADE",
        onUpdate: "RESTRICT",
      });

      customerCart.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      customerCart.belongsTo(models.masterService, {
        foreignKey: "refferenceId",
        as: "service",
        constraints: false,
      });

      customerCart.belongsTo(models.masterPackage, {
        foreignKey: "refferenceId",
        as: "package",
        constraints: false,
      });
    }
  }

  customerCart.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      refferenceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      refferenceType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: {
            args: [["product", "service", "package"]],
            msg: "Invalid favorite type",
          },
        },
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      isSelected: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isDirect: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isOnPayment: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "customerCart",
      tableName: "customerCart",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return customerCart;
};
