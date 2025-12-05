"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterLocationImage extends Model {
    static associate(models) {
      masterLocationImage.belongsTo(models.masterLocation, {
        foreignKey: "locationId",
        as: "location",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  masterLocationImage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "masterLocation",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      imageUrl: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "masterLocationImage",
      tableName: "masterLocationImage",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return masterLocationImage;
};
