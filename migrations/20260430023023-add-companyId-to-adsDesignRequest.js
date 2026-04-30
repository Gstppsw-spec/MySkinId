"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("adsDesignRequest", "companyId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "masterCompany",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "locationId"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("adsDesignRequest", "companyId");
  },
};
