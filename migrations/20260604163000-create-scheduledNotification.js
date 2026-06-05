"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("scheduledNotification", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      flashSaleId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "flashSale",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      clickRoute: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      target: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "ALL",
      },
      sentCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM("PENDING", "SENT", "FAILED", "ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      scheduledAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      repeatDaily: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lastSentAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("scheduledNotification");
  },
};
