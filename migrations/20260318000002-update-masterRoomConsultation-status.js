"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      `UPDATE masterRoomConsultation SET status = 'pending' WHERE status = 'waiting_questionnaire'`
    );
  },

  down: async (queryInterface, Sequelize) => {
    // No-op or reverse if possible, but reversing might be ambiguous
  },
};
