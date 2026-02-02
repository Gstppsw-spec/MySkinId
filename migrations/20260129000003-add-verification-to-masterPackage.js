"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("masterPackage", "isVerified", {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        });

        await queryInterface.addColumn("masterPackage", "verifiedDate", {
            type: Sequelize.DATE,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("masterPackage", "isVerified");
        await queryInterface.removeColumn("masterPackage", "verifiedDate");
    },
};
