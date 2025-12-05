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

      // Relasi ke customer
      masterConsultationPrescription.belongsTo(models.masterCustomer, {
        foreignKey: "customerId",
        as: "customer",
      });

      // Relasi ke product
      masterConsultationPrescription.belongsTo(models.masterProduct, {
        foreignKey: "productId",
        as: "product",
      });

      // Jika dokter berasal dari tabel doctor lain,
      // tambahkan relasinya di sini jika sudah ada model doctor.
      // masterConsultationPrescription.belongsTo(models.masterDoctor, {
      //   foreignKey: "doctorId",
      //   as: "doctor",
      // });
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
      doctorId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      productId: {
        type: DataTypes.UUID,
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
