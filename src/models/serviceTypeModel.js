const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MsServiceType = sequelize.define(
  "MsServiceType",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    isactive: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    createbyuserid: { type: DataTypes.UUID },
    updatedate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updateuserid: { type: DataTypes.UUID },
  },
  {
    tableName: "msservicetype",
    timestamps: false,
  }
);

module.exports = MsServiceType;
