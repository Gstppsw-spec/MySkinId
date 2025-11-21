'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('msrole', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      isactive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      isSuperAdmin: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isAdminCompany: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isAdminOutlet: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isDoctor: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      updatedate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updateuserid: {
        type: Sequelize.UUID,
        allowNull: true,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('msrole');
  }
};
