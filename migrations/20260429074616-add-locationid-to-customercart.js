"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("customerCart", "locationId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "masterLocation",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("customerCart", "locationId");
  },
};
