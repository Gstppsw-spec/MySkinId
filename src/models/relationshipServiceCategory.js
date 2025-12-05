"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class relationshipServiceCategory extends Model {
    static associate(models) {
      // biasanya pivot table tidak butuh associate lagi karena sudah dihandle belongsToMany
    }
  }

  relationshipServiceCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      serviceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      subCategoryServiceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "relationshipServiceCategory",
      tableName: "relationshipServiceCategory",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return relationshipServiceCategory;
};
