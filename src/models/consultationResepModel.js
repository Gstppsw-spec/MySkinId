"use strict";

module.exports = (sequelize, DataTypes) => {
  const ConsultationPrescription = sequelize.define(
    "ConsultationPrescription",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      roomid: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      doctorid: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      customerid: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      medicines: {
        type: DataTypes.JSON, // format: [{name, dose, qty}]
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "consultationprescription",
      timestamps: false,
    }
  );

  // RELASI DITARUH DI SINI
  ConsultationPrescription.associate = (models) => {
    ConsultationPrescription.belongsTo(models.ConsultationRoom, {
      foreignKey: "roomid",
      as: "room",
    });
  };

  return ConsultationPrescription;
};
