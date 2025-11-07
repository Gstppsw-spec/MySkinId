const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MsRole = sequelize.define(
  "MsRole",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    isactive: { type: DataTypes.BOOLEAN, defaultValue: true },
    isSuperAdmin: { type: DataTypes.BOOLEAN},
    isAdminCompany: { type: DataTypes.BOOLEAN},
    isAdminOutlet: { type: DataTypes.BOOLEAN},
    isDoctor: { type: DataTypes.BOOLEAN},
    updatedate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updateuserid: { type: DataTypes.UUID },
  },
  {
    tableName: "msrole",
    timestamps: false,
  }
);

module.exports = MsRole;
