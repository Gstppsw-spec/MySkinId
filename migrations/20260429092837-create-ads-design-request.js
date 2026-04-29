"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("adsDesignRequest", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      locationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterLocation",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      adsType: {
        type: Sequelize.ENUM("BANNER", "CAROUSEL", "POPUP"),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      referenceImages: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resultImages: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      revisionNote: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      revisionCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.ENUM(
          "REQUESTED",
          "PROCESSING",
          "WAITING_APPROVAL",
          "REVISION_REQUESTED",
          "PENDING_PAYMENT",
          "COMPLETED",
          "CANCELLED"
        ),
        defaultValue: "REQUESTED",
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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
    await queryInterface.dropTable("adsDesignRequest");
  },
};
