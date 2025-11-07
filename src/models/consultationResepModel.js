const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const ConsultationRoom = require("./roomConsultationModel");


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
      references: {
        model: ConsultationRoom,
        key: "id",
      },
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
      type: DataTypes.JSON, // [{name: 'Paracetamol', dose: '500mg', qty: 10}]
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

module.exports = ConsultationPrescription;
