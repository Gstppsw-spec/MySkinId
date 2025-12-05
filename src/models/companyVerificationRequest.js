"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyVerificationRequest extends Model {
    static associate(models) {
      CompanyVerificationRequest.belongsTo(models.masterCompany, {
        foreignKey: "companyId",
        as: "company",
      });
    }
  }

  CompanyVerificationRequest.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "pending",
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "CompanyVerificationRequest",
      tableName: "companyVerificationRequest",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return CompanyVerificationRequest;
};
