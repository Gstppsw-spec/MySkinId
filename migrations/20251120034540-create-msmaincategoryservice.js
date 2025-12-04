'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('msmain_service_category', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
    await queryInterface.dropTable('msmain_service_category');
  }
};
