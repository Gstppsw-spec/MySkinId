"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AdsDesignRequest extends Model {
    static associate(models) {
      AdsDesignRequest.belongsTo(models.masterLocation, {
        foreignKey: "locationId",
        as: "location",
      });
      AdsDesignRequest.belongsTo(models.order, {
        foreignKey: "orderId",
        as: "order",
      });
      AdsDesignRequest.belongsTo(models.masterCompany, {
        foreignKey: "companyId",
        as: "company",
      });
    }
  }

  AdsDesignRequest.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      adsType: {
        type: DataTypes.ENUM("BANNER", "CAROUSEL", "POPUP"),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      referenceImages: {
        type: DataTypes.TEXT, // Store as JSON string of URLs
        get() {
          const rawValue = this.getDataValue("referenceImages");
          return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
          if (value && typeof value === "object") {
            this.setDataValue("referenceImages", JSON.stringify(value));
          } else {
            this.setDataValue("referenceImages", value);
          }
        },
      },
      resultImages: {
        type: DataTypes.TEXT, // Store as JSON string of URLs
        get() {
          const rawValue = this.getDataValue("resultImages");
          return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
          if (value && typeof value === "object") {
            this.setDataValue("resultImages", JSON.stringify(value));
          } else {
            this.setDataValue("resultImages", value);
          }
        },
      },
      revisionNote: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      revisionCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "REQUESTED",
          "PROCESSING",
          "WAITING_APPROVAL",
          "REVISION_REQUESTED",
          "PENDING_PAYMENT",
          "COMPLETED",
          "CANCELLED"
        ),
        defaultValue: "REQUESTED",
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "AdsDesignRequest",
      tableName: "adsDesignRequest",
      timestamps: true,
    }
  );

  return AdsDesignRequest;
};
