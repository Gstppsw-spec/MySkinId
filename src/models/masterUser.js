"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterUser extends Model {
    static associate(models) {
      this.belongsTo(models.masterRole, {
        foreignKey: "roleId",
        as: "role",
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
      jwtToken: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "masterUser",
      tableName: "masterUser",
      timestamps: true,
    }
  );

  return masterUser;
};
