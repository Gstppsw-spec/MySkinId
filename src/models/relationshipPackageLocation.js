"use strict";

module.exports = (sequelize, DataTypes) => {
  const relationshipPackageLocation = sequelize.define(
    "relationshipPackageLocation",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      packageId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "relationshipPackageLocation",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["packageId", "locationId"],
        },
      ],
    }
  );

  relationshipPackageLocation.associate = (models) => {
    relationshipPackageLocation.belongsTo(models.masterPackage, {
      foreignKey: "packageId",
      as: "package",
    });

    relationshipPackageLocation.belongsTo(models.masterLocation, {
      foreignKey: "locationId",
      as: "location",
    });
  };

  return relationshipPackageLocation;
};
