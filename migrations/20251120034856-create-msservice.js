'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('msservice', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      locationid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'mslocation',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      servicetypeid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'msservicetype',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      normalprice: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discountpercent: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      discountvalue: {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
      },
      finalprice: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
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
    await queryInterface.dropTable('msservice');
  },
};
