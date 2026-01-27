'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add columns to masterCity
        await queryInterface.addColumn('masterCity', 'latitude', {
            type: Sequelize.DECIMAL(10, 7),
            allowNull: true
        });
        await queryInterface.addColumn('masterCity', 'longitude', {
            type: Sequelize.DECIMAL(10, 7),
            allowNull: true
        });

        // Add columns to masterDistrict
        await queryInterface.addColumn('masterDistrict', 'latitude', {
            type: Sequelize.DECIMAL(10, 7),
            allowNull: true
        });
        await queryInterface.addColumn('masterDistrict', 'longitude', {
            type: Sequelize.DECIMAL(10, 7),
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Remove columns from masterDistrict
        await queryInterface.removeColumn('masterDistrict', 'longitude');
        await queryInterface.removeColumn('masterDistrict', 'latitude');

        // Remove columns from masterCity
        await queryInterface.removeColumn('masterCity', 'longitude');
        await queryInterface.removeColumn('masterCity', 'latitude');
    }
};
