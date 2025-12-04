"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterCompany extends Model {
    static associate(models) {
      this.belongsTo(models.masterUser, {
        foreignKey: "createdBy",
        as: "createdByUser",
      });

      this.belongsTo(models.masterUser, {
        foreignKey: "updatedBy",
        as: "updatedByUser",
      });

      this.belongsTo(models.masterUser, {
        foreignKey: "deletedBy",
        as: "deletedByUser",
      });

      this.hasMany(models.masterLocation, {
        foreignKey: "companyId",
        as: "locations",
      });

      this.hasMany(models.CompanyVerificationRequest, {
        foreignKey: "companyId",
        as: "verificationRequests",
      });
    }
  }

  masterCompany.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      // Basic info
      name: DataTypes.STRING(150),
      code: DataTypes.STRING(50),
      address: DataTypes.STRING(255),
      city: DataTypes.STRING(100),
      province: DataTypes.STRING(100),
      district: DataTypes.STRING(100),
      subDistrict: DataTypes.STRING(100),
      postalCode: DataTypes.STRING(10),

      phone: DataTypes.STRING(20),
      fax: DataTypes.STRING(20),
      email: DataTypes.STRING(150),
      websiteUrl: DataTypes.STRING(255),

      // Legal info
      npwp: DataTypes.STRING(30),
      nib: DataTypes.STRING(50),
      siup: DataTypes.STRING(50),
      taxStatus: DataTypes.STRING(50),

      // Branding
      logo: DataTypes.STRING(255),

      // Finance
      bankName: DataTypes.STRING(100),
      bankAccountName: DataTypes.STRING(100),
      bankAccountNumber: DataTypes.STRING(50),
      currency: {
        type: DataTypes.STRING(10),
        defaultValue: "IDR",
      },

      // Operational
      timezone: {
        type: DataTypes.STRING(50),
        defaultValue: "Asia/Jakarta",
      },
      locale: {
        type: DataTypes.STRING(10),
        defaultValue: "id-ID",
      },

      // Audit trail
      createdBy: DataTypes.UUID,
      updatedBy: DataTypes.UUID,
      deletedBy: DataTypes.UUID,

      // Soft delete
      isactive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
      deletedAt: DataTypes.DATE,
      isactive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      verifiedDate: DataTypes.DATE
    },
    {
      sequelize,
      modelName: "masterCompany",
      tableName: "masterCompany",
      timestamps: true,
      paranoid: true, // aktifkan soft delete berdasarkan deletedAt
    }
  );

  return masterCompany;
};
