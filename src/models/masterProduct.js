"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class masterProduct extends Model {
    static associate(models) {
      masterProduct.belongsToMany(models.masterProductCategory, {
        through: "relationshipProductCategory",
        foreignKey: "productId",
        otherKey: "productCategoryId",
        as: "categories",
      });

      masterProduct.belongsToMany(models.masterConsultationCategory, {
        through: "relationshipProductConsultationCategory",
        foreignKey: "productId",
        otherKey: "consultationCategoryId",
        as: "consultationCategories",
      });

      masterProduct.belongsToMany(models.masterGroupProduct, {
        through: "relationshipGroupProduct",
        foreignKey: "productId",
        otherKey: "groupId",
        as: "groupProduct",
      });

      masterProduct.hasMany(models.masterProductImage, {
        foreignKey: "productId",
        as: "images",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      masterProduct.hasMany(models.customerFavorites, {
        foreignKey: "refferenceId",
        as: "favorites",
      });

      // 🔹 lokasi pengiriman / gudang
      masterProduct.belongsTo(models.masterLocation, {
        foreignKey: "locationId",
        as: "location",
        constraints: false, // FK di DB boleh menyusul
      });
    }
  }

  masterProduct.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      name: { type: DataTypes.STRING(150), allowNull: false },
      sku: { type: DataTypes.STRING(50), allowNull: true, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },

      price: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },

      discountPercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      isPrescriptionRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      weightGram: {
        type: DataTypes.INTEGER, // gram
        allowNull: true,
      },

      lengthCm: {
        type: DataTypes.INTEGER, // cm
        allowNull: true,
      },

      widthCm: {
        type: DataTypes.INTEGER, // cm
        allowNull: true,
      },

      heightCm: {
        type: DataTypes.INTEGER, // cm
        allowNull: true,
      },

      locationId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      function: { type: DataTypes.TEXT, allowNull: true },
      compotition: { type: DataTypes.TEXT, allowNull: true },
      dose: { type: DataTypes.TEXT, allowNull: true },
      rulesOfUse: { type: DataTypes.TEXT, allowNull: true },
      attention: { type: DataTypes.TEXT, allowNull: true },
      packaging: { type: DataTypes.STRING(255), allowNull: true },
      ratingAvg: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      ratingCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      verifiedDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "masterProduct",
      tableName: "masterProduct",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  );

  return masterProduct;
};
