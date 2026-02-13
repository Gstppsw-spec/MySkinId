'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create postTags table
    await queryInterface.createTable('postTags', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.CHAR(36),
        defaultValue: Sequelize.UUIDV4,
      },
      postId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
      },
      referenceId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
      },
      referenceType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // 2. Remove columns from posts
    await queryInterface.removeColumn('posts', 'referenceId');
    await queryInterface.removeColumn('posts', 'referenceType');
  },

  async down(queryInterface, Sequelize) {
    // 1. Add columns back to posts
    await queryInterface.addColumn('posts', 'referenceId', {
      type: Sequelize.CHAR(36),
      allowNull: true,
    });
    await queryInterface.addColumn('posts', 'referenceType', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // 2. Drop postTags table
    await queryInterface.dropTable('postTags');
  }
};
