"use strict";

module.exports = (sequelize, DataTypes) => {
  const ConsultationCategory = sequelize.define(
    "ConsultationCategory",
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
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      tableName: "consultationcategory",
      timestamps: false,
    }
  );

  ConsultationCategory.associate = function (models) {
    // contoh relasi kalau nanti dibutuhkan
    // ConsultationCategory.hasMany(models.Consultation, { foreignKey: "categoryid" });
  };

  return ConsultationCategory;
};
