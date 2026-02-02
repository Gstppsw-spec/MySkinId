'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('masterRoomConsultation', 'locationId', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'masterLocation',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        await queryInterface.addColumn('masterRoomConsultation', 'latitude', {
            type: Sequelize.DECIMAL(10, 7),
            allowNull: true
        });

        await queryInterface.addColumn('masterRoomConsultation', 'longitude', {
            type: Sequelize.DECIMAL(10, 7),
            allowNull: true
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('masterRoomConsultation', 'locationId');
        await queryInterface.removeColumn('masterRoomConsultation', 'latitude');
        await queryInterface.removeColumn('masterRoomConsultation', 'longitude');
    }
};
