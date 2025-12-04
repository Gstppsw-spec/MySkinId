"use strict";

module.exports = (sequelize, DataTypes) => {
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

  ConsultationMessage.associate = (models) => {
    ConsultationMessage.belongsTo(models.ConsultationRoom, {
      foreignKey: "roomid",
      as: "room",
    });

    ConsultationMessage.hasMany(models.ConsultationImage, {
      foreignKey: "messageid",
      as: "images",
    });
  };

  return ConsultationMessage;
};

