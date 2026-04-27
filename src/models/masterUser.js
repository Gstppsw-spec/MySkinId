"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterUser extends Model {
    static associate(models) {
      this.belongsTo(models.masterRole, {
        foreignKey: "roleId",
        as: "role",
      });

      this.belongsToMany(models.masterLocation, {
        through: models.relationshipUserLocation,
        foreignKey: "userId",
        otherKey: "locationId",
        as: "locations",
      });

      this.hasMany(models.relationshipUserLocation, {
        foreignKey: "userId",
        as: "userLocations",
      });

      this.belongsToMany(models.masterCompany, {
        through: models.relationshipUserCompany,
        foreignKey: "userId",
        otherKey: "companyId",
        as: "companies",
      });

      this.hasMany(models.relationshipUserCompany, {
        foreignKey: "userId",
        as: "userCompanies",
      });
    }
  }

  masterUser.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
      },
      name: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        unique: true,
      },
      phone: DataTypes.STRING,
      password: DataTypes.STRING,
      roleId: DataTypes.UUID,
      avatar: {
        type: DataTypes.STRING,
        get() {
          const rawValue = this.getDataValue("avatar");
          if (!rawValue) return null;

          // If already a full URL, return as is
          if (rawValue.startsWith("http://") || rawValue.startsWith("https://")) {
            return rawValue;
          }

          const BASE_URL =
            process.env.BASE_URL ||
            `${process.env.APP_PROTOCOL || "http"}://${process.env.APP_HOST || "localhost"
            }:${process.env.APP_PORT || 3000}`;

          return `${BASE_URL}/${rawValue}`;
        },
      },
      isactive: DataTypes.BOOLEAN,
      isAvailableConsul: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

    },
    {
      sequelize,
      modelName: "masterUser",
      tableName: "masterUser",
      timestamps: true,
    },
  );

  return masterUser;
};
