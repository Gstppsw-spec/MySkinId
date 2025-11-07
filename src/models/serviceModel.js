const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Mslocation = require("./locationModel");
const MsServiceType = require("./serviceTypeModel");
const MsSubServiceCategory = require("./subCategoryServiceModel");
const MsServiceCategoryMapping = require("./serviceCategoryMappingModel");

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
      default: 1,
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

MsService.belongsTo(Mslocation, { foreignKey: "locationid", as: "location" });
Mslocation.hasMany(MsService, { foreignKey: "locationid", as: "services" });

MsService.belongsTo(MsServiceType, {
  foreignKey: "servicetypeid",
  as: "servicetype",
});
MsServiceType.hasMany(MsService, {
  foreignKey: "servicetypeid",
  as: "services",
});

MsService.belongsToMany(MsSubServiceCategory, {
  through: MsServiceCategoryMapping,
  foreignKey: "serviceid",
  otherKey: "servicecategoryid",
  as: "servicecategories",
});

MsSubServiceCategory.belongsToMany(MsService, {
  through: MsServiceCategoryMapping,
  foreignKey: "servicecategoryid",
  otherKey: "serviceid",
  as: "services",
});

// Service bisa punya banyak item package
MsService.hasMany(MsServicePackageItem, {
  foreignKey: "packageid",
  as: "packageitems",
});

// Item package mengarah ke service yang dikandungnya
MsServicePackageItem.belongsTo(MsService, {
  foreignKey: "serviceid",
  as: "serviceitem",
});


module.exports = { MsService, MsServicePackageItem };

