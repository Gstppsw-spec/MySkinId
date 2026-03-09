"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("customerAddress", "latitude", {
            type: Sequelize.DECIMAL(10, 7),
            allowNull: true,
        });

        await queryInterface.addColumn("customerAddress", "longitude", {
            type: Sequelize.DECIMAL(10, 7),
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("customerAddress", "latitude");
        await queryInterface.removeColumn("customerAddress", "longitude");
    },
};
