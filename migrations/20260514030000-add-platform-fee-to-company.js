'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('masterCompany').catch(() => ({}));
    if (!tableInfo.platformFee) {
      await queryInterface.addColumn('masterCompany', 'platformFee', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('masterCompany', 'platformFee');
  }
};
