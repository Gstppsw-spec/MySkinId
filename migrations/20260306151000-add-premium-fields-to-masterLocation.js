"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("masterLocation", "isPremium", {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        });
        await queryInterface.addColumn("masterLocation", "premiumExpiredAt", {
            type: Sequelize.DATE,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("masterLocation", "isPremium");
        await queryInterface.removeColumn("masterLocation", "premiumExpiredAt");
    },
};
