'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('mssub_service_category', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      mainservicecategoryid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'msmain_service_category',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      isactive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      updatedate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updateuserid: {
        type: Sequelize.UUID,
        allowNull: true,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('mssub_service_category');
  },
};
