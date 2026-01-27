"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class customerFavorites extends Model {
    static associate(models) {
      customerFavorites.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
      });

      customerFavorites.belongsTo(models.masterProduct, {
        foreignKey: "refferenceId",
        as: "product",
        constraints: false,
      });

      customerFavorites.belongsTo(models.masterService, {
        foreignKey: "refferenceId",
        as: "service",
        constraints: false,
      });

      customerFavorites.belongsTo(models.masterLocation, {
        foreignKey: "refferenceId",
        as: "location",
        constraints: false,
      });

      customerFavorites.belongsTo(models.masterPackage, {
        foreignKey: "refferenceId",
        as: "package",
        constraints: false,
      });
    }
  }

  customerFavorites.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      refferenceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      favoriteType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: {
            args: [["product", "service", "location", "package"]],
            msg: "Invalid favorite type",
          },
        },
      },
      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: "customerFavorites",
      tableName: "customer_favorites",
      timestamps: true
    }
  );

  return customerFavorites;
};
