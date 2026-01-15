"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterConsultationPrescription extends Model {
    static associate(models) {
      // Relasi ke room consultation
      masterConsultationPrescription.belongsTo(models.masterRoomConsultation, {
        foreignKey: "roomId",
        as: "room",
      });

      // Relasi ke masterService
      masterConsultationPrescription.belongsTo(models.masterService, {
        foreignKey: "refferenceId",
        constraints: false, // Penting karna refferenceId bisa mengacu ke table lain
        as: "service",
      });

      // Relasi ke masterPackage
      masterConsultationPrescription.belongsTo(models.masterPackage, {
        foreignKey: "refferenceId",
        constraints: false, // Penting karna refferenceId bisa mengacu ke table lain
        as: "package",
      });
    }
  }

  masterConsultationPrescription.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      refferenceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      refferenceType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "masterConsultationPrescription",
      tableName: "masterConsultationPrescription",
      timestamps: true,
    }
  );

  return masterConsultationPrescription;
};
