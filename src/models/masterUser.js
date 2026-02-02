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
      name: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        unique: true,
      },
      phone: DataTypes.STRING,
      password: DataTypes.STRING,
      roleId: DataTypes.UUID,
      avatar: DataTypes.STRING,
      isactive: DataTypes.BOOLEAN,

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
