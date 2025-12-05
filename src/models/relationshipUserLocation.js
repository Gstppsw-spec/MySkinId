"use strict";

module.exports = (sequelize, DataTypes) => {
  const relationshipUserLocation = sequelize.define(
    "relationshipUserLocation",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      isactive: {
        type: DataTypes.BOOLEAN,
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
      tableName: "relationshipUserLocation",
      timestamps: true,
    }
  );

  relationshipUserLocation.associate = (models) => {
    relationshipUserLocation.belongsTo(models.masterUser, {
      foreignKey: "userId",
      as: "user",
    });

    relationshipUserLocation.belongsTo(models.masterLocation, {
      foreignKey: "locationId",
      as: "location",
    });
  };

  return relationshipUserLocation;
};
