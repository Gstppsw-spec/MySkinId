"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterConsultationMessage extends Model {
    static associate(models) {
      // Relasi ke Room
      masterConsultationMessage.belongsTo(models.masterRoomConsultation, {
        foreignKey: "roomId",
        as: "room",
      });
    }
  }

  masterConsultationMessage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      roomId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      senderRole: {
        type: DataTypes.ENUM("customer", "doctor"),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      messageType: {
        type: DataTypes.ENUM("text", "image"),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "masterConsultationMessage",
      tableName: "masterConsultationMessage",
      timestamps: true,
    }
  );

  return masterConsultationMessage;
};
