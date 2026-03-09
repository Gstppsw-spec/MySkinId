"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class relationshipQuestionnaireCategoryConsultation extends Model {
        static associate(models) {
            relationshipQuestionnaireCategoryConsultation.belongsTo(
                models.masterQuestionnaire,
                {
                    foreignKey: "questionnaireId",
                    as: "questionnaire",
                },
            );

            relationshipQuestionnaireCategoryConsultation.belongsTo(
                models.masterConsultationCategory,
                {
                    foreignKey: "consultationCategoryId",
                    as: "consultationCategory",
                },
            );
        }
    }

    relationshipQuestionnaireCategoryConsultation.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            questionnaireId: {
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
            modelName: "relationshipQuestionnaireCategoryConsultation",
            tableName: "relationshipQuestionnaireCategoryConsultation",
            timestamps: true,
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        },
    );

    return relationshipQuestionnaireCategoryConsultation;
};
