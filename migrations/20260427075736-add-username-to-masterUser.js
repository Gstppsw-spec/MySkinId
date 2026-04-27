'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('masterUser', 'username', {
      type: Sequelize.STRING(50),
      allowNull: true,
      unique: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('masterUser', 'username');
  }
};
