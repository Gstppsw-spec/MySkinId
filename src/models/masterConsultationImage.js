"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterConsultationImage extends Model {
    static associate(models) {
      // Relasi ke message
      masterConsultationImage.belongsTo(models.masterConsultationMessage, {
        foreignKey: "messageId",
        as: "message",
      });

      // Relasi ke room
      masterConsultationImage.belongsTo(models.masterRoomConsultation, {
        foreignKey: "roomId",
        as: "room",
      });
    }
  }

  masterConsultationImage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      messageId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      imageUrl: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "masterConsultationImage",
      tableName: "masterConsultationImage",
      timestamps: true,
    }
  );

  return masterConsultationImage;
};
