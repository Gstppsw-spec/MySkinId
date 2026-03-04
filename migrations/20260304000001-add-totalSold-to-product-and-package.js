"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn("masterProduct", "totalSold", {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            after: "ratingCount",
        });

        await queryInterface.addColumn("masterPackage", "totalSold", {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            after: "ratingCount",
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn("masterProduct", "totalSold");
        await queryInterface.removeColumn("masterPackage", "totalSold");
    },
};
