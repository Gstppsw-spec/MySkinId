'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if masterCustomer.lastActiveAt exists
    const customerTableInfo = await queryInterface.describeTable('masterCustomer').catch(() => ({}));
    if (!customerTableInfo.lastActiveAt) {
      await queryInterface.addColumn('masterCustomer', 'lastActiveAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // Check if adsPurchase.clickCount exists
    const adsTableInfo = await queryInterface.describeTable('adsPurchase').catch(() => ({}));
    if (!adsTableInfo.clickCount) {
      await queryInterface.addColumn('adsPurchase', 'clickCount', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('masterCustomer', 'lastActiveAt');
    await queryInterface.removeColumn('adsPurchase', 'clickCount');
  }
};
