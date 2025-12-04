"use strict";

module.exports = (sequelize, DataTypes) => {
  const ConsultationImage = sequelize.define(
    "ConsultationImage",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      messageid: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      roomid: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      image_url: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      tableName: "consultationimage",
      timestamps: false,
    }
  );

  ConsultationImage.associate = function (models) {
    // ConsultationImage → belongsTo ConsultationMessage
    ConsultationImage.belongsTo(models.ConsultationMessage, {
      foreignKey: "messageid",
      as: "message",
    });

    // ConsultationMessage → hasMany ConsultationImage
    models.ConsultationMessage.hasMany(ConsultationImage, {
      foreignKey: "messageid",
      as: "consultationimage",
    });

    // ConsultationImage → belongsTo ConsultationRoom
    ConsultationImage.belongsTo(models.ConsultationRoom, {
      foreignKey: "roomid",
      as: "room",
    });

    // ConsultationRoom → hasMany ConsultationImage
    models.ConsultationRoom.hasMany(ConsultationImage, {
      foreignKey: "roomid",
      as: "roomimage",
    });
  };

  return ConsultationImage;
};
