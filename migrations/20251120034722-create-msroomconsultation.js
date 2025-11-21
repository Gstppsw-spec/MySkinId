'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('consultationroom', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      roomcode: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      categoryid: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'consultationcategory',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      doctorid: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      customerid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'msuser_customer',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
      },
      expiredat: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      createuserid: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      updateuserid: {
        type: Sequelize.UUID,
        allowNull: true,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('consultationroom');
  }
};
