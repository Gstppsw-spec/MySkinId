"use strict";

module.exports = (sequelize, DataTypes) => {
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

  MsServiceCategoryMapping.associate = (models) => {
    // 🔗 Mapping ke msservice
    MsServiceCategoryMapping.belongsTo(models.MsService, {
      foreignKey: "serviceid",
      as: "service",
    });

    models.MsService.hasMany(MsServiceCategoryMapping, {
      foreignKey: "serviceid",
      as: "serviceMappings",
    });

    // 🔗 Mapping ke mssub_service_category
    MsServiceCategoryMapping.belongsTo(models.MsSubServiceCategory, {
      foreignKey: "servicecategoryid",
      as: "subcategory",
    });

    models.MsSubServiceCategory.hasMany(MsServiceCategoryMapping, {
      foreignKey: "servicecategoryid",
      as: "categoryMappings",
    });
  };

  return MsServiceCategoryMapping;
};
