'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('customerAddress', 'districtId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            after: 'cityId'
        });

        await queryInterface.addColumn('masterLocation', 'districtId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            after: 'cityId'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('customerAddress', 'districtId');
        await queryInterface.removeColumn('masterLocation', 'districtId');
    }
};
