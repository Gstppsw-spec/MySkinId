"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("orderPayment", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      paymentMethod: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
      },
      referenceNumber: {
        type: Sequelize.STRING(100),
      },
      paymentStatus: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "PENDING",
        // PENDING / SUCCESS / FAILED / REFUNDED
      },
      gatewayResponse: {
        type: Sequelize.JSON,
      },
      paymentDate: {
        type: Sequelize.DATE,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable("orderPayment");
  },
};
