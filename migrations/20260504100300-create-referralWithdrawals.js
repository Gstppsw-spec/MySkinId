"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("referralWithdrawals", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
      amount: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
      },
      bankName: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      accountNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      accountName: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("PENDING", "APPROVED", "REJECTED", "COMPLETED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      adminNote: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      processedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      processedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "masterUser",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
    await queryInterface.dropTable("referralWithdrawals");
  },
};
