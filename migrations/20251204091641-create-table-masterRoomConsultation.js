"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("masterRoomConsultation", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      roomCode: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      consultationCategoryId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterConsultationCategory",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      doctorId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterCustomer",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "pending",
      },
      expiredAt: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex("masterRoomConsultation", ["customerId"]);
    await queryInterface.addIndex("masterRoomConsultation", [
      "consultationCategoryId",
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("masterRoomConsultation");
  },
};
