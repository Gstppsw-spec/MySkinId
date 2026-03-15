"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class flashSale extends Model {
    static associate(models) {
      flashSale.hasMany(models.flashSaleItem, {
        foreignKey: "flashSaleId",
        as: "items",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  flashSale.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("UPCOMING", "ACTIVE", "ENDED"),
        allowNull: false,
        defaultValue: "UPCOMING",
      },
    },
    {
      sequelize,
      modelName: "flashSale",
      tableName: "flashSale",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return flashSale;
};
