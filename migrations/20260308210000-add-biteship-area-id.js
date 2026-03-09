"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add biteshipAreaId to masterLocation
        await queryInterface.addColumn("masterLocation", "biteshipAreaId", {
            type: Sequelize.STRING(100),
            allowNull: true,
        });

        // Add biteshipAreaId to customerAddress
        await queryInterface.addColumn("customerAddress", "biteshipAreaId", {
            type: Sequelize.STRING(100),
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("masterLocation", "biteshipAreaId");
        await queryInterface.removeColumn("customerAddress", "biteshipAreaId");
    },
};
