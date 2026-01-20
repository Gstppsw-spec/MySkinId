"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn("masterCustomer", "username", {
            type: Sequelize.STRING(50),
            allowNull: true, // Initially nullable to handle existing records
            unique: true,
        });

        // Add index for faster username lookups
        await queryInterface.addIndex("masterCustomer", ["username"], {
            name: "idx_username",
            unique: true,
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex("masterCustomer", "idx_username");
        await queryInterface.removeColumn("masterCustomer", "username");
    },
};
