"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("requestVerification", {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
                allowNull: false,
            },
            refferenceId: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            refferenceType: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: "Enum: company, location, product, service, package",
            },
            status: {
                type: Sequelize.STRING(50),
                allowNull: true,
            },
            note: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("requestVerification");
    },
};
