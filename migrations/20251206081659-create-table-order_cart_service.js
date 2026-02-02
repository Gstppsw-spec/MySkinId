"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("order_cart_service", {
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
      serviceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterService",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      qty: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      isSelected: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("order_cart_service");
  },
};
