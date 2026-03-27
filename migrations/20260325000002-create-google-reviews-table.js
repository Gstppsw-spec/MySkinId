"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("googleReviews", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
      googleReviewId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
      },
      authorName: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      authorPhotoUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      relativeTimeDescription: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("googleReviews");
  },
};
