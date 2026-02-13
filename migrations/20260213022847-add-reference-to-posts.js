'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('posts', 'referenceId', {
      type: Sequelize.CHAR(36),
      allowNull: true,
    });
    await queryInterface.addColumn('posts', 'referenceType', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('posts', 'referenceId');
    await queryInterface.removeColumn('posts', 'referenceType');
  }
};
