"use strict";

module.exports = (sequelize, DataTypes) => {
  const GoogleReview = sequelize.define(
    "GoogleReview",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      googleReviewId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      },
      authorName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      authorPhotoUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      relativeTimeDescription: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "googleReviews",
      timestamps: true,
    }
  );

  GoogleReview.associate = (models) => {
    GoogleReview.belongsTo(models.masterLocation, {
      foreignKey: "locationId",
      as: "location",
    });
  };

  return GoogleReview;
};
