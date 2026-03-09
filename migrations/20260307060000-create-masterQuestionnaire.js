"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("masterQuestionnaire", {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            question: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            questionType: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: "text",
                comment: "text, single_choice, multiple_choice",
            },
            options: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: "JSON array of options for single_choice/multiple_choice",
            },
            sortOrder: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            isRequired: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
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
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("masterQuestionnaire");
    },
};
