"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("masterProduct", "isVerified", {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        });

        await queryInterface.addColumn("masterProduct", "verifiedDate", {
            type: Sequelize.DATE,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("masterProduct", "isVerified");
        await queryInterface.removeColumn("masterProduct", "verifiedDate");
    },
};
