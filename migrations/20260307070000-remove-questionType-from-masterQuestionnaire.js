"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.removeColumn("masterQuestionnaire", "questionType");
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.addColumn("masterQuestionnaire", "questionType", {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: "single_choice",
            comment: "text, single_choice, multiple_choice",
        });
    },
};
