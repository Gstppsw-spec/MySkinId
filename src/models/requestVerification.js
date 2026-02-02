"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class requestVerification extends Model {
        static associate(models) {
            // Polymorphic associations based on refferenceType
            requestVerification.belongsTo(models.masterCompany, {
                foreignKey: "refferenceId",
                as: "company",
                constraints: false,
            });

            requestVerification.belongsTo(models.masterLocation, {
                foreignKey: "refferenceId",
                as: "location",
                constraints: false,
            });

            requestVerification.belongsTo(models.masterProduct, {
                foreignKey: "refferenceId",
                as: "product",
                constraints: false,
            });

            requestVerification.belongsTo(models.masterService, {
                foreignKey: "refferenceId",
                as: "service",
                constraints: false,
            });

            requestVerification.belongsTo(models.masterPackage, {
                foreignKey: "refferenceId",
                as: "package",
                constraints: false,
            });
        }
    }

    requestVerification.init(
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4,
            },
            refferenceId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            refferenceType: {
                type: DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["company", "location", "product", "service", "package"]],
                        msg: "Invalid refferenceType. Must be one of: company, location, product, service, package",
                    },
                },
            },
            status: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            note: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "requestVerification",
            tableName: "requestVerification",
            timestamps: true,
        }
    );

    return requestVerification;
};
