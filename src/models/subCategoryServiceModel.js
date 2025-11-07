const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const MsMainServiceCategory = require("./mainCategoryServiceModel");

const MsSubServiceCategory = sequelize.define(
  "MsSubServiceCategory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    mainservicecategoryid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "msmain_service_category",
        key: "id",
      },
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    isactive: { type: DataTypes.BOOLEAN, defaultValue: true },
    updatedate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updateuserid: { type: DataTypes.UUID },
  },
  {
    tableName: "mssub_service_category",
    timestamps: false,
  }
);

// Relasi ke main category
MsSubServiceCategory.belongsTo(MsMainServiceCategory, {
  foreignKey: "mainservicecategoryid",
  as: "mainservicecategory",
});
MsMainServiceCategory.hasMany(MsSubServiceCategory, {
  foreignKey: "mainservicecategoryid",
  as: "subservicecategory",
});

module.exports = MsSubServiceCategory;
