'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. masterLocation
        await queryInterface.changeColumn('masterLocation', 'cityId', {
            type: Sequelize.UUID,
            allowNull: true
        });
        await queryInterface.changeColumn('masterLocation', 'districtId', {
            type: Sequelize.UUID,
            allowNull: true
        });

        // 2. customerAddress
        await queryInterface.changeColumn('customerAddress', 'cityId', {
            type: Sequelize.UUID,
            allowNull: true
        });
        await queryInterface.changeColumn('customerAddress', 'districtId', {
            type: Sequelize.UUID,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Reverse logic (approximate as we can't truly go back to old IDs)
        await queryInterface.changeColumn('masterLocation', 'cityId', {
            type: Sequelize.INTEGER,
            allowNull: true
        });
        await queryInterface.changeColumn('masterLocation', 'districtId', {
            type: Sequelize.INTEGER,
            allowNull: true
        });
        await queryInterface.changeColumn('customerAddress', 'cityId', {
            type: Sequelize.INTEGER,
            allowNull: true
        });
        await queryInterface.changeColumn('customerAddress', 'districtId', {
            type: Sequelize.INTEGER,
            allowNull: true
        });
    }
};
