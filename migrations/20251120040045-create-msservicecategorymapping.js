'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('msservicecategorymapping', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      serviceid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'msservice',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      servicecategoryid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'mssub_service_category',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('msservicecategorymapping');
  },
};
