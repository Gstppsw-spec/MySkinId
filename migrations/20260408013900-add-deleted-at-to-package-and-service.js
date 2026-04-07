'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Add deletedAt to masterPackage
    await queryInterface.addColumn('masterPackage', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 2. Add deletedAt to masterService
    await queryInterface.addColumn('masterService', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    // 1. Remove deletedAt from masterPackage
    await queryInterface.removeColumn('masterPackage', 'deletedAt');

    // 2. Remove deletedAt from masterService
    await queryInterface.removeColumn('masterService', 'deletedAt');
  }
};
