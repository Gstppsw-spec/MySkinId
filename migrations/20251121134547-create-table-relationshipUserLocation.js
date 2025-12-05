"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("relationshipUserLocation", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "masterUser", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      locationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "masterLocation", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      isactive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("relationshipUserLocation");
  },
};
