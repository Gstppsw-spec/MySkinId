'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('msservicetype', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      isactive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      createbyuserid: {
        type: Sequelize.UUID,
        allowNull: true,
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
    await queryInterface.dropTable('msservicetype');
  },
};
