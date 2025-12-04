"use strict";

module.exports = (sequelize, DataTypes) => {
  const MsServiceType = sequelize.define(
    "MsServiceType",
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
      isactive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      createdate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      createbyuserid: {
        type: DataTypes.UUID,
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
      tableName: "msservicetype",
      timestamps: false,
    }
  );

  // 🔗 Association (dipanggil oleh index.js)
  MsServiceType.associate = (models) => {
    MsServiceType.hasMany(models.MsService, {
      foreignKey: "servicetypeid",
      as: "services",
    });
  };

  return MsServiceType;
};
