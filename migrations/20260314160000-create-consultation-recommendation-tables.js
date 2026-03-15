"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create consultationRecommendation table
    await queryInterface.createTable("consultationRecommendation", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      roomId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterRoomConsultation",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex("consultationRecommendation", ["roomId"], {
      name: "idx_consultation_rec_room",
    });

    // 2. Create consultationRecommendationCategory pivot table
    await queryInterface.createTable("consultationRecommendationCategory", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      recommendationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "consultationRecommendation",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      consultationCategoryId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterConsultationCategory",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex(
      "consultationRecommendationCategory",
      ["recommendationId"],
      {
        name: "idx_crc_recommendation",
      }
    );
    await queryInterface.addIndex(
      "consultationRecommendationCategory",
      ["consultationCategoryId"],
      {
        name: "idx_crc_consultation_category",
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("consultationRecommendationCategory");
    await queryInterface.dropTable("consultationRecommendation");
  },
};
