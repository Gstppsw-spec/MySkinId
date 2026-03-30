'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('masterPaymentMethod', 'gateway', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'xendit'
    });
    
    await queryInterface.addColumn('orderPayment', 'paymentGateway', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'xendit'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('masterPaymentMethod', 'gateway');
    await queryInterface.removeColumn('orderPayment', 'paymentGateway');
  }
};
