"use strict";

module.exports = (sequelize, DataTypes) => {
  const RatingImage = sequelize.define(
    "RatingImage",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },

      ratingId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      imageUrl: {
        type: DataTypes.STRING(255),
        allowNull: false,
        get() {
          const rawValue = this.getDataValue("imageUrl");
          if (!rawValue) return null;

          if (
            rawValue.startsWith("http://") ||
            rawValue.startsWith("https://")
          ) {
            return rawValue;
          }

          const BASE_URL =
            process.env.BASE_URL ||
            `${process.env.APP_PROTOCOL || "http"}://${process.env.APP_HOST || "localhost"
            }:${process.env.APP_PORT || 3000}`;

          return `${BASE_URL}/${rawValue}`;
        },
      },
    },
    {
      tableName: "rating_images",
      timestamps: true,
    }
  );

  RatingImage.associate = function (models) {
    RatingImage.belongsTo(models.Rating, {
      foreignKey: "ratingId",
      as: "rating",
    });
  };

  return RatingImage;
};
