"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class masterPaymentMethod extends Model {
    static associate(models) {
      // define association here if any
    }
  }
  masterPaymentMethod.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: DataTypes.STRING,
      name: DataTypes.STRING,
      type: DataTypes.STRING,
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      logoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        get() {
          const rawValue = this.getDataValue("logoUrl");
          if (!rawValue) return null;

          // If already a full URL, return as is
          if (rawValue.startsWith("http://") || rawValue.startsWith("https://")) {
            return rawValue;
          }

          const BASE_URL =
            process.env.BASE_URL ||
            `${process.env.APP_PROTOCOL || "http"}://${
              process.env.APP_HOST || "localhost"
            }:${process.env.APP_PORT || 3000}`;

          return `${BASE_URL}/${rawValue}`;
        },
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
      deletedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "masterPaymentMethod",
      tableName: "masterPaymentMethod",
      timestamps: true,
      paranoid: true,
    },
  );
  return masterPaymentMethod;
};
