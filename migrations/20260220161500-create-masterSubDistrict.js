'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('masterSubDistrict', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            districtId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'masterDistrict',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            zipCode: {
                type: Sequelize.STRING(10),
                allowNull: true
            },
            latitude: {
                type: Sequelize.DECIMAL(10, 8),
                allowNull: true
            },
            longitude: {
                type: Sequelize.DECIMAL(11, 8),
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('masterSubDistrict');
    }
};
