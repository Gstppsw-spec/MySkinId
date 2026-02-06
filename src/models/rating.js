"use strict";

module.exports = (sequelize, DataTypes) => {
  const Rating = sequelize.define(
    "Rating",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },

      entityType: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },

      entityId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      review: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "ratings",
      timestamps: true,
    }
  );
  Rating.associate = function (models) {
    Rating.belongsTo(models.masterCustomer, {
      foreignKey: "customerId",
      as: "customer",
    });

    Rating.hasMany(models.RatingImage, {
      foreignKey: "ratingId",
      as: "images",
    });

    Rating.hasMany(models.RatingLike, {
      foreignKey: "ratingId",
      as: "likes",
    });
  };

  return Rating;
};
