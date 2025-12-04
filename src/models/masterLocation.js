"use strict";
module.exports = (sequelize, DataTypes) => {
  const masterLocation = sequelize.define(
    "masterLocation",
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

      name: { type: DataTypes.STRING(150), allowNull: false },
      code: { type: DataTypes.STRING(50) },

      address: { type: DataTypes.STRING(255) },
      province: { type: DataTypes.STRING(100) },
      district: { type: DataTypes.STRING(100) },
      subdistrict: { type: DataTypes.STRING(100) },
      postalCode: { type: DataTypes.STRING(10) },

      cityId: { type: DataTypes.INTEGER },

      latitude: { type: DataTypes.DECIMAL(10, 7) },
      longitude: { type: DataTypes.DECIMAL(10, 7) },

      phone: { type: DataTypes.STRING(20) },
      email: { type: DataTypes.STRING(150) },

      operationHours: { type: DataTypes.STRING(50) },
      operationDays: { type: DataTypes.STRING(100) },
      timezone: {
        type: DataTypes.STRING(50),
        defaultValue: "Asia/Jakarta",
      },

      bankName: { type: DataTypes.STRING(100) },
      bankAccountName: { type: DataTypes.STRING(100) },
      bankAccountNumber: { type: DataTypes.STRING(50) },

      createdBy: { type: DataTypes.UUID },
      updatedBy: { type: DataTypes.UUID },
      deletedBy: { type: DataTypes.UUID },

      isactive: { type: DataTypes.BOOLEAN, defaultValue: true },

      createdAt: { type: DataTypes.DATE },
      updatedAt: { type: DataTypes.DATE },
      deletedAt: { type: DataTypes.DATE },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      verifiedDate: DataTypes.DATE,
    },
    {
      tableName: "masterLocation",
      timestamps: true,
      paranoid: true,
    }
  );

  masterLocation.associate = (models) => {
    masterLocation.belongsTo(models.masterCompany, {
      foreignKey: "companyId",
      as: "company",
    });

    masterLocation.belongsTo(models.masterUser, {
      foreignKey: "createdBy",
      as: "creator",
    });

    masterLocation.belongsTo(models.masterUser, {
      foreignKey: "updatedBy",
      as: "updater",
    });

    masterLocation.belongsTo(models.masterUser, {
      foreignKey: "deletedBy",
      as: "deleter",
    });

    masterLocation.hasMany(models.masterLocationImage, {
      foreignKey: "locationId",
      as: "images",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    masterLocation.hasMany(models.relationshipUserLocation, {
      foreignKey: "locationId",
      as: "userLocations",
    });

    masterLocation.hasMany(models.LocationVerificationRequest, {
        foreignKey: "locationId",
        as: "verificationRequests",
      });
  };

  return masterLocation;
};
