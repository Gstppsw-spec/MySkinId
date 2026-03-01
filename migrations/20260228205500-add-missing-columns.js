"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add trackingNumber to transactionShipping
        await queryInterface.addColumn("transactionShipping", "trackingNumber", {
            type: Sequelize.STRING(100),
            allowNull: true,
        });

        // Add checkoutUrl and instructions to orderPayment
        await queryInterface.addColumn("orderPayment", "checkoutUrl", {
            type: Sequelize.TEXT,
            allowNull: true,
        });
        await queryInterface.addColumn("orderPayment", "instructions", {
            type: Sequelize.TEXT,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("transactionShipping", "trackingNumber");
        await queryInterface.removeColumn("orderPayment", "checkoutUrl");
        await queryInterface.removeColumn("orderPayment", "instructions");
    },
};
