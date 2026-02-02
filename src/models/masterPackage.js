"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterPackage extends Model {
    static associate(models) {
      masterPackage.hasMany(models.masterPackageItems, {
        foreignKey: "packageId",
        as: "items",
      });

      masterPackage.belongsTo(models.masterLocation, {
        foreignKey: "locationId",
        as: "location",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  masterPackage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },


      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      discountPercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      ratingAvg: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      ratingCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      verifiedDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "masterPackage",
      tableName: "masterPackage",
      timestamps: true,
      // paranoid: true,
    }
  );

  return masterPackage;
};
