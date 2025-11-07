const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MsServiceCategoryMapping = sequelize.define(
  "MsServiceCategoryMapping",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    serviceid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "msservice", key: "id" },
    },
    servicecategoryid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "mssub_service_category", key: "id" },
    },
  },
  {
    tableName: "msservicecategorymapping",
    timestamps: false,
  }
);

module.exports = MsServiceCategoryMapping;
