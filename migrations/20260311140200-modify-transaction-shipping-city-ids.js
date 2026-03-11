"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn("transactionShipping", "originCityId", {
            type: Sequelize.UUID,
            allowNull: false,
        });
        await queryInterface.changeColumn("transactionShipping", "destinationCityId", {
            type: Sequelize.UUID,
            allowNull: false,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn("transactionShipping", "originCityId", {
            type: Sequelize.INTEGER,
            allowNull: false,
        });
        await queryInterface.changeColumn("transactionShipping", "destinationCityId", {
            type: Sequelize.INTEGER,
            allowNull: false,
        });
    },
};
