"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class masterQuestionnaireAnswer extends Model {
        static associate(models) {
            masterQuestionnaireAnswer.belongsTo(models.masterQuestionnaire, {
                foreignKey: "questionnaireId",
                as: "questionnaire",
            });

            masterQuestionnaireAnswer.belongsTo(models.masterRoomConsultation, {
                foreignKey: "roomId",
                as: "room",
            });
        }
    }

    masterQuestionnaireAnswer.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            roomId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            questionnaireId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            answer: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "masterQuestionnaireAnswer",
            tableName: "masterQuestionnaireAnswer",
            timestamps: true,
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        },
    );

    return masterQuestionnaireAnswer;
};
