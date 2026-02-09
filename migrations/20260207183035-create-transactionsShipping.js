"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("transactionShipping", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      transactionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "transactions",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      receiverName: Sequelize.STRING(100),
      receiverPhone: Sequelize.STRING(20),
      address: Sequelize.STRING(255),

      originCityId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      destinationCityId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      totalWeight: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      courierCode: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      courierService: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },

      shippingCost: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
      },

      estimatedDelivery: {
        type: Sequelize.STRING(20),
      },

      shippingStatus: {
        type: Sequelize.STRING(20),
        defaultValue: "PENDING",
      },
      rajaOngkirResponse: {
        type: Sequelize.JSON,
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
    await queryInterface.dropTable("transactionShipping");
  },
};
