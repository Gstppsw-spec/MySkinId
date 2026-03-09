"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Rename rajaOngkirResponse to shippingApiResponse
        await queryInterface.renameColumn(
            "transactionShipping",
            "rajaOngkirResponse",
            "shippingApiResponse"
        );

        // Add postal code columns for better Biteship integration
        await queryInterface.addColumn("transactionShipping", "originPostalCode", {
            type: Sequelize.STRING(10),
            allowNull: true,
        });

        await queryInterface.addColumn(
            "transactionShipping",
            "destinationPostalCode",
            {
                type: Sequelize.STRING(10),
                allowNull: true,
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.renameColumn(
            "transactionShipping",
            "shippingApiResponse",
            "rajaOngkirResponse"
        );

        await queryInterface.removeColumn(
            "transactionShipping",
            "originPostalCode"
        );

        await queryInterface.removeColumn(
            "transactionShipping",
            "destinationPostalCode"
        );
    },
};
