const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MsMainServiceCategory = sequelize.define(
  "MsMainServiceCategory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    isactive: { type: DataTypes.BOOLEAN, defaultValue: true },
    updatedate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updateuserid: { type: DataTypes.UUID },
  },
  {
    tableName: "msmain_service_category",
    timestamps: false,
  }
);

module.exports = MsMainServiceCategory;
