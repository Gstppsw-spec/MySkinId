"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterRole extends Model {
    static associate(models) {
      this.hasMany(models.masterUser, {
        foreignKey: "roleId",
        as: "users",
      });
    }
  }

  masterRole.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      roleCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "masterRole",
      tableName: "masterRole",
      timestamps: true,
    }
  );

  return masterRole;
};
