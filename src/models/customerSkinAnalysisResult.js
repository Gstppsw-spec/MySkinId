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
