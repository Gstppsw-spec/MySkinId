// models/consultationCategoryModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ConsultationCategory = sequelize.define(
  "ConsultationCategory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isactive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    updatedate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updateuserid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "consultationcategory",
    timestamps: false,
  }
);

module.exports = ConsultationCategory;
