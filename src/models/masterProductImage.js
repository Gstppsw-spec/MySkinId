"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterProductImage extends Model {
    static associate(models) {
      masterProductImage.belongsTo(models.masterProduct, {
        foreignKey: "productId",
        as: "product",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  masterProductImage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "masterProduct",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      imageUrl: {
        type: DataTypes.STRING(255),
        allowNull: false,
        get() {
          const rawValue = this.getDataValue("imageUrl");
          if (!rawValue) return null;
          const BASE_URL =
            process.env.BASE_URL ||
            `${process.env.APP_PROTOCOL || "http"}://${
              process.env.APP_HOST || "localhost"
            }:${process.env.APP_PORT || 3000}`;

          return `${BASE_URL}/${rawValue}`;
        },
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
      modelName: "masterProductImage",
      tableName: "masterProductImage",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return masterProductImage;
};
