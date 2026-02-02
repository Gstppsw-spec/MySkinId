"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("masterService", "isVerified", {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        });

        await queryInterface.addColumn("masterService", "verifiedDate", {
            type: Sequelize.DATE,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("masterService", "isVerified");
        await queryInterface.removeColumn("masterService", "verifiedDate");
    },
};
