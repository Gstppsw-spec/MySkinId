"use strict";

module.exports = (sequelize, DataTypes) => {
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
        validate: { isEmail: true },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      roleid: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      companyid: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      locationid: {
        type: DataTypes.UUID,
        allowNull: true,
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

  MsUser.associate = (models) => {
    // Company
    MsUser.belongsTo(models.Mscompany, { foreignKey: "companyid", as: "company" });
    models.Mscompany.hasMany(MsUser, { foreignKey: "companyid", as: "users" });

    // Location
    MsUser.belongsTo(models.Mslocation, { foreignKey: "locationid", as: "location" });
    models.Mslocation.hasMany(MsUser, { foreignKey: "locationid", as: "users_in_location" });

    // Role
    MsUser.belongsTo(models.MsRole, { foreignKey: "roleid", as: "role" });
    models.MsRole.hasMany(MsUser, { foreignKey: "roleid", as: "users_role" });
  };

  return MsUser;
};
