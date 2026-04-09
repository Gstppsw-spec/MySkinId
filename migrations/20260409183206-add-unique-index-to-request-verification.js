"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("requestVerification", ["refferenceId", "refferenceType"], {
      unique: true,
      name: "unique_verification_request",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("requestVerification", "unique_verification_request");
  },
};
