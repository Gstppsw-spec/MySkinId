const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const MsLocation = require("./locationModel");

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
      references: {
        model: "mslocation",
        key: "id",
      },
    },
    isImageByOutlet: { type: DataTypes.BOOLEAN, defaultValue: false },
    isImageByCustomer: { type: DataTypes.BOOLEAN, defaultValue: false },
    image_url: { type: DataTypes.STRING(255), allowNull: false }, // hanya path/URL
    updateuserid: { type: DataTypes.UUID, allowNull: true },
    updatedate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "image_location",
    timestamps: false,
  }
);

ImageLocation.belongsTo(MsLocation, {
  foreignKey: "locationid",
  as: "location",
});
MsLocation.hasMany(ImageLocation, {
  foreignKey: "locationid",
  as: "imagelocation",
});

module.exports = ImageLocation;
