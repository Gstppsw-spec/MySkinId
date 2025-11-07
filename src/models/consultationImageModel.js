const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const ConsultationMessage = require("./consultationMessageModel");
const ConsultationRoom = require("./roomConsultationModel");

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
      references: {
        model: "consultationmessage",
        key: "id",
      },
    },
    roomid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "consultationroom",
        key: "id",
      },
    },
    image_url: { type: DataTypes.STRING(255), allowNull: false },
  },
  {
    tableName: "consultationimage",
    timestamps: false,
  }
);

ConsultationImage.belongsTo(ConsultationMessage, {
  foreignKey: "messageid",
  as: "message",
});
ConsultationMessage.hasMany(ConsultationImage, {
  foreignKey: "messageid",
  as: "consultationimage",
});

ConsultationImage.belongsTo(ConsultationRoom, {
  foreignKey: "roomid",
  as: "room",
});
ConsultationRoom.hasMany(ConsultationImage, {
  foreignKey: "roomid",
  as: "roomimage",
});

module.exports = ConsultationImage;
