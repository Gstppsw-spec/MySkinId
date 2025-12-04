'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('msservicepackageitem', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      packageid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'msservice',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      sortorder: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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
      isactive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('msservicepackageitem');
  },
};
