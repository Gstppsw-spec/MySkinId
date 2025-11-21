"use strict";

module.exports = (sequelize, DataTypes) => {
  const MsService = sequelize.define(
    "MsService",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(200), allowNull: false },
      locationid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "mslocation", key: "id" },
      },
      servicetypeid: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "msservicetype", key: "id" },
      },
      normalprice: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discountpercent: { type: DataTypes.FLOAT, defaultValue: 0 },
      discountvalue: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      finalprice: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      isactive: { type: DataTypes.BOOLEAN, defaultValue: true },
      createdate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      createbyuserid: { type: DataTypes.UUID },
      updatedate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updateuserid: { type: DataTypes.UUID },
    },
    {
      tableName: "msservice",
      timestamps: false,
    }
  );

  MsService.associate = (models) => {

    // LOCATION
    MsService.belongsTo(models.Mslocation, {
      foreignKey: "locationid",
      as: "location",
    });

    models.Mslocation.hasMany(MsService, {
      foreignKey: "locationid",
      as: "services",
    });

    // SERVICE TYPE
    MsService.belongsTo(models.MsServiceType, {
      foreignKey: "servicetypeid",
      as: "servicesByType",
    });

    // models.MsServiceType.hasMany(MsService, {
    //   foreignKey: "servicetypeid",
    //   as: "services",
    // });

    // MANY-TO-MANY CATEGORY
    MsService.belongsToMany(models.MsSubServiceCategory, {
      through: models.MsServiceCategoryMapping,
      foreignKey: "serviceid",
      otherKey: "servicecategoryid",
      as: "servicecategories",
    });

    models.MsSubServiceCategory.belongsToMany(MsService, {
      through: models.MsServiceCategoryMapping,
      foreignKey: "servicecategoryid",
      otherKey: "serviceid",
      as: "services",
    });

    // PACKAGE ITEMS
    MsService.hasMany(models.MsServicePackageItem, {
      foreignKey: "packageid",
      as: "packageitems",
    });

  };

  return MsService;
};
