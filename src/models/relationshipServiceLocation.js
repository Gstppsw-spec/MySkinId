"use strict";

module.exports = (sequelize, DataTypes) => {
  const relationshipServiceLocation = sequelize.define(
    "relationshipServiceLocation",
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
      tableName: "relationshipServiceLocation",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["serviceId", "locationId"],
        },
      ],
    }
  );

  relationshipServiceLocation.associate = (models) => {
    relationshipServiceLocation.belongsTo(models.masterService, {
      foreignKey: "serviceId",
      as: "service",
    });

    relationshipServiceLocation.belongsTo(models.masterLocation, {
      foreignKey: "locationId",
      as: "location",
    });
  };

  return relationshipServiceLocation;
};
