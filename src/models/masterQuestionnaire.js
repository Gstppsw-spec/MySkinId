"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class masterQuestionnaire extends Model {
        static associate(models) {
            masterQuestionnaire.belongsToMany(
                models.masterConsultationCategory,
                {
                    through: "relationshipQuestionnaireCategoryConsultation",
                    foreignKey: "questionnaireId",
                    otherKey: "consultationCategoryId",
                    as: "consultationCategories",
                },
            );

            masterQuestionnaire.hasMany(models.masterQuestionnaireAnswer, {
                foreignKey: "questionnaireId",
                as: "answers",
            });
        }
    }

    masterQuestionnaire.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            question: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            options: {
                type: DataTypes.TEXT,
                allowNull: true,
                get() {
                    const rawValue = this.getDataValue("options");
                    if (!rawValue) return null;
                    try {
                        return JSON.parse(rawValue);
                    } catch (e) {
                        return rawValue;
                    }
                },
                set(value) {
                    if (value && typeof value !== "string") {
                        this.setDataValue("options", JSON.stringify(value));
                    } else {
                        this.setDataValue("options", value);
                    }
                },
            },
            sortOrder: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            isRequired: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        },
        {
            sequelize,
            modelName: "masterQuestionnaire",
            tableName: "masterQuestionnaire",
            timestamps: true,
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        },
    );

    return masterQuestionnaire;
};
