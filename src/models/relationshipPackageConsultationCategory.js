"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class relationshipPackageConsultationCategory extends Model {
        static associate(models) {
            // pivot table – relasi di-handle belongsToMany di masterPackage & masterConsultationCategory
        }
    }

    relationshipPackageConsultationCategory.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            packageId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            consultationCategoryId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "relationshipPackageConsultationCategory",
            tableName: "relationshipPackageConsultationCategory",
            timestamps: true,
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        }
    );

    return relationshipPackageConsultationCategory;
};
