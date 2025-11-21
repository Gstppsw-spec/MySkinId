"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("mslocation", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      code: { type: Sequelize.STRING(20) },
      companyid: { type: Sequelize.UUID },
      cityid: { type: Sequelize.INTEGER },
      address: { type: Sequelize.STRING(255) },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      operation_hours: { type: Sequelize.STRING(50) },
      operation_days: { type: Sequelize.STRING(100) },
      isactive: { type: Sequelize.BOOLEAN, defaultValue: true },
      updatedate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updateuserid: { type: Sequelize.UUID },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("mslocation");
  },
};
