const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Mscompany = sequelize.define(
  "Mscompany",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false },
    address: { type: DataTypes.STRING(255) },
    phone: { type: DataTypes.STRING(50) },
    email: { type: DataTypes.STRING(100) },
    isactive: { type: DataTypes.BOOLEAN, defaultValue: true },
    updatedate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updateuserid: { type: DataTypes.UUID },
  },
  {
    tableName: "mscompany",
    timestamps: false,
  }
);

module.exports = Mscompany;
