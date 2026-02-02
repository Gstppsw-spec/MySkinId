"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("customerCart", {
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
      refferenceId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      refferenceType: {
        type: Sequelize.STRING(100),
        allowNull: false,
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
      isDirect: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      isOnPayment: {
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
    await queryInterface.dropTable("customerCart");
  },
};
