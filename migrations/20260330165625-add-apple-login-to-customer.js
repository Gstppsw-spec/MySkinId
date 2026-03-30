'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('masterCustomer', 'appleId', {
      type: Sequelize.STRING(100),
      unique: true,
      allowNull: true,
    });

    // Modify the loginMethod enum
    await queryInterface.sequelize.query(
      "ALTER TABLE masterCustomer MODIFY COLUMN loginMethod ENUM('phone', 'email', 'google', 'apple') NOT NULL DEFAULT 'phone';"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('masterCustomer', 'appleId');

    // Revert the loginMethod enum
    await queryInterface.sequelize.query(
      "ALTER TABLE masterCustomer MODIFY COLUMN loginMethod ENUM('phone', 'email', 'google') NOT NULL DEFAULT 'phone';"
    );
  }
};
