"use strict";

module.exports = (sequelize, DataTypes) => {
  const MsMainServiceCategory = sequelize.define(
    "MsMainServiceCategory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(100), allowNull: false },
      isactive: { type: DataTypes.BOOLEAN, defaultValue: true },
      updatedate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updateuserid: { type: DataTypes.UUID },
    },
    {
      tableName: "msmain_service_category",
      timestamps: false,
    }
  );

  // 🔗 kalau nanti ada relasi, taruh di sini
  MsMainServiceCategory.associate = (models) => {
    // contoh bila nanti punya child category:
    // MsMainServiceCategory.hasMany(models.MsServiceCategory, {
    //   foreignKey: "maincategoryid",
    //   as: "serviceCategories",
    // });
  };

  return MsMainServiceCategory;
};
