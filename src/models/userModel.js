const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Import relasi
const MsCompany = require("./companyModel");
const MsLocation = require("./locationModel");
const MsRole = require("./roleModel");

const MsUser = sequelize.define(
  "MsUser",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    roleid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "msrole",
        key: "id",
      },
    },
    companyid: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "mscompany",
        key: "id",
      },
    },
    locationid: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "mslocation",
        key: "id",
      },
    },
    isactive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    jwttoken: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: "msuser",
    timestamps: false,
  }
);

// === ASSOCIATIONS ===
MsUser.belongsTo(MsCompany, { foreignKey: "companyid", as: "company" });
MsCompany.hasMany(MsUser, { foreignKey: "companyid", as: "users" });

MsUser.belongsTo(MsLocation, { foreignKey: "locationid", as: "location" });
MsLocation.hasMany(MsUser, { foreignKey: "locationid", as: "users" });

MsUser.belongsTo(MsRole, { foreignKey: "roleid", as: "role" });
MsRole.hasMany(MsUser, { foreignKey: "roleid", as: "users" });

module.exports = MsUser;
