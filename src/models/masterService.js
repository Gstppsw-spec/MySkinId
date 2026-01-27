"use strict";

module.exports = (sequelize, DataTypes) => {
  const masterService = sequelize.define(
    "masterService",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      compotition: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      postTreatmentCare: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      contraIndication: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      securityAndCertification: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      durationOfResults: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      indicationOfUse: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      benefit: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discountPercent: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      ratingAvg: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      ratingCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "masterService",
      timestamps: true,
    }
  );

  masterService.associate = (models) => {
    masterService.belongsTo(models.masterLocation, {
      foreignKey: "locationId",
      as: "location",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    masterService.belongsToMany(models.masterSubCategoryService, {
      through: "relationshipServiceCategory",
      foreignKey: "serviceId",
      otherKey: "subCategoryServiceId",
      as: "categories",
    });

    masterService.hasMany(models.customerFavorites, {
      foreignKey: "refferenceId",
      as: "favorites",
    });
  };

  return masterService;
};
