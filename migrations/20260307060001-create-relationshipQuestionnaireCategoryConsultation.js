"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            "relationshipQuestionnaireCategoryConsultation",
            {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true,
                },
                questionnaireId: {
                    type: Sequelize.UUID,
                    allowNull: false,
                    references: {
                        model: "masterQuestionnaire",
                        key: "id",
                    },
                    onUpdate: "CASCADE",
                    onDelete: "CASCADE",
                },
                consultationCategoryId: {
                    type: Sequelize.UUID,
                    allowNull: false,
                    references: {
                        model: "masterConsultationCategory",
                        key: "id",
                    },
                    onUpdate: "CASCADE",
                    onDelete: "CASCADE",
                },
                createdAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW,
                },
                updatedAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.NOW,
                },
            },
        );

        await queryInterface.addIndex(
            "relationshipQuestionnaireCategoryConsultation",
            ["questionnaireId", "consultationCategoryId"],
            {
                unique: true,
                name: "unique_questionnaire_category",
            },
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable(
            "relationshipQuestionnaireCategoryConsultation",
        );
    },
};
