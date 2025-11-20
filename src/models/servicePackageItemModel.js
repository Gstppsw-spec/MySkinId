"use strict";

module.exports = (sequelize, DataTypes) => {
  const MsServicePackageItem = sequelize.define(
    "MsServicePackageItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      packageid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "msservice",
          key: "id",
        },
      },
      serviceid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "msservice",
          key: "id",
        },
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      sortorder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
      isactive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "msservicepackageitem",
      timestamps: false,
    }
  );

  // 🔗 Lakukan asosiasi setelah semua model diload
  MsServicePackageItem.associate = (models) => {
    // Item mengacu ke service pemilik package
    MsServicePackageItem.belongsTo(models.MsService, {
      foreignKey: "serviceid",
      as: "serviceitem",
    });

    // Package (yang juga msservice) memiliki banyak package item
    models.MsService.hasMany(MsServicePackageItem, {
      foreignKey: "packageid",
      as: "package",
    });
  };

  return MsServicePackageItem;
};
