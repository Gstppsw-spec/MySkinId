"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("transactionItems", "weight", {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "Weight per unit in grams",
        });
        await queryInterface.addColumn("transactionItems", "totalWeight", {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "Total weight in grams",
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("transactionItems", "weight");
        await queryInterface.removeColumn("transactionItems", "totalWeight");
    },
};
