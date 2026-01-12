"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterPackageItems extends Model {
    static associate(models) {
      masterPackageItems.belongsTo(models.masterPackage, {
        foreignKey: "packageId",
        as: "package",
      });

      masterPackageItems.belongsTo(models.masterService, {
        foreignKey: "serviceId",
        as: "service",
      });

      masterPackageItems.belongsTo(models.masterLocation, {
        foreignKey: "locationId",
        as: "location",
      });
    }
  }

  masterPackageItems.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      packageId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      serviceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    },
    {
      sequelize,
      modelName: "masterPackageItems",
      tableName: "masterPackageItems",
      timestamps: true,
      // paranoid: true,
    }
  );

  return masterPackageItems;
};
