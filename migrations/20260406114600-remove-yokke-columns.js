'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('masterPaymentMethods', 'gateway');
    } catch (err) {
      console.warn("Column gateway might not exist or failed to drop", err.message);
    }
    
    try {
      await queryInterface.removeColumn('orderPayments', 'paymentGateway');
    } catch (err) {
      console.warn("Column paymentGateway might not exist or failed to drop", err.message);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('masterPaymentMethods', 'gateway', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'xendit'
    });
    await queryInterface.addColumn('orderPayments', 'paymentGateway', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'xendit'
    });
  }
};
