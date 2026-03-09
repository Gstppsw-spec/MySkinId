"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add originAreaId and destinationAreaId to transactionShipping
        await queryInterface.addColumn("transactionShipping", "originAreaId", {
            type: Sequelize.STRING(100),
            allowNull: true,
        });

        await queryInterface.addColumn("transactionShipping", "destinationAreaId", {
            type: Sequelize.STRING(100),
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("transactionShipping", "originAreaId");
        await queryInterface.removeColumn("transactionShipping", "destinationAreaId");
    },
};
