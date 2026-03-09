"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("masterLocation", "xenditAccountId", {
            type: Sequelize.STRING(100),
            allowNull: true,
            defaultValue: null,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("masterLocation", "xenditAccountId");
    },
};
