"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("masterQuestionnaireAnswer", {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            roomId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "masterRoomConsultation",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
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
            answer: {
                type: Sequelize.TEXT,
                allowNull: false,
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
        });

        await queryInterface.addIndex("masterQuestionnaireAnswer", ["roomId"]);
        await queryInterface.addIndex("masterQuestionnaireAnswer", [
            "questionnaireId",
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("masterQuestionnaireAnswer");
    },
};
