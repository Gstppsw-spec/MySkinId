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
