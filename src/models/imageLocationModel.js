"use strict";

module.exports = (sequelize, DataTypes) => {
  const ImageLocation = sequelize.define(
    "ImageLocation",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      locationid: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      isImageByOutlet: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isImageByCustomer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      image_url: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      updateuserid: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      updatedate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "image_location",
      timestamps: false,
    }
  );

  // RELASI DITARUH DI SINI
  ImageLocation.associate = (models) => {
    ImageLocation.belongsTo(models.Mslocation, {
      foreignKey: "locationid",
      as: "location",
    });

    models.Mslocation.hasMany(ImageLocation, {
      foreignKey: "locationid",
      as: "imagelocation",
    });
  };

  return ImageLocation;
};
