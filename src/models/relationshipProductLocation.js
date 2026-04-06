"use strict";

module.exports = (sequelize, DataTypes) => {
  const relationshipProductLocation = sequelize.define(
    "relationshipProductLocation",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
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
      tableName: "relationshipProductLocation",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["productId", "locationId"],
        },
      ],
    }
  );

  relationshipProductLocation.associate = (models) => {
    relationshipProductLocation.belongsTo(models.masterProduct, {
      foreignKey: "productId",
      as: "product",
    });

    relationshipProductLocation.belongsTo(models.masterLocation, {
      foreignKey: "locationId",
      as: "location",
    });
  };

  return relationshipProductLocation;
};
