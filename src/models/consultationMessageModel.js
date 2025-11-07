const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const ConsultationRoom = require("./roomConsultationModel");

const ConsultationMessage = sequelize.define(
  "ConsultationMessage",
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
    senderrole: {
      type: DataTypes.ENUM("customer", "doctor"),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    messageType: {
      type: DataTypes.ENUM("text", "image"),
      defaultValue: "text",
    },
    createdate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "consultationmessage",
    timestamps: false,
  }
);

module.exports = ConsultationMessage;
