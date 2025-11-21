'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('image_location', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      isImageByOutlet: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isImageByCustomer: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      image_url: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      updateuserid: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      updatedate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('image_location');
  }
};
