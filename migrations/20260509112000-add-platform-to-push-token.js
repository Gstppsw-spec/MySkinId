'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('pushToken', 'platform', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'mobile',
      after: 'deviceId'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('pushToken', 'platform');
  }
};
