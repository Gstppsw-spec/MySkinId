"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Extend currently active (BOOKED) vouchers that were created with 7-day expiry to 30 days
    await queryInterface.sequelize.query(`
      UPDATE customerVouchers 
      SET expiredAt = DATE_ADD(expiredAt, INTERVAL 23 DAY) 
      WHERE status = 'BOOKED' 
        AND expiredAt IS NOT NULL 
        AND TIMESTAMPDIFF(DAY, updatedAt, expiredAt) < 15
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the extension (subtract 23 days) for BOOKED vouchers
    await queryInterface.sequelize.query(`
      UPDATE customerVouchers 
      SET expiredAt = DATE_SUB(expiredAt, INTERVAL 23 DAY) 
      WHERE status = 'BOOKED' 
        AND expiredAt IS NOT NULL 
        AND TIMESTAMPDIFF(DAY, updatedAt, expiredAt) > 20
    `);
  },
};
