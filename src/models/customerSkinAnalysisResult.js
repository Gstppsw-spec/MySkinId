"use strict";

module.exports = (sequelize, DataTypes) => {
  const CustomerSkinAnalysisResult = sequelize.define(
    "CustomerSkinAnalysisResult",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
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
      rawResponse: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      acneScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      wrinkleScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      oilScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      skinType: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      severity: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
    },
    {
      tableName: "customer_skin_analysis_results",
      timestamps: true,
    }
  );

  CustomerSkinAnalysisResult.associate = (models) => {
    CustomerSkinAnalysisResult.belongsTo(models.masterCustomer, {
      foreignKey: "customerId",
      as: "customer",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return CustomerSkinAnalysisResult;
};
