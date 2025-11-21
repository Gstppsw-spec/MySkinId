"use strict";

module.exports = (sequelize, DataTypes) => {
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

      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      isactive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
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
      tableName: "mssub_service_category",
      timestamps: false,
    }
  );

  // 🔗 Relasi dideklarasikan di sini, dipanggil via index.js
  MsSubServiceCategory.associate = (models) => {
    MsSubServiceCategory.belongsTo(models.MsMainServiceCategory, {
      foreignKey: "mainservicecategoryid",
      as: "mainservicecategory",
    });

    models.MsMainServiceCategory.hasMany(MsSubServiceCategory, {
      foreignKey: "mainservicecategoryid",
      as: "subservicecategory",
    });
  };

  return MsSubServiceCategory;
};
