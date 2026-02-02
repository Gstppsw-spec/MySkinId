"use strict";

module.exports = (sequelize, DataTypes) => {
  const relationshipUserCompany = sequelize.define(
    "relationshipUserCompany",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      isactive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "relationshipUserCompany",
      timestamps: true,
    },
  );

  relationshipUserCompany.associate = (models) => {
    relationshipUserCompany.belongsTo(models.masterUser, {
      foreignKey: "userId",
      as: "user",
    });

    relationshipUserCompany.belongsTo(models.masterCompany, {
      foreignKey: "companyId",
      as: "company",
    });
  };

  return relationshipUserCompany;
};
