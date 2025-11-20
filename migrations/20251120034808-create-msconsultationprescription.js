'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('consultationprescription', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      roomid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'consultationroom',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      doctorid: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      customerid: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      medicines: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('consultationprescription');
  }
};
