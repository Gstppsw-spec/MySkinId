"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("masterUser", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(150),
        unique: true,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(20),
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      roleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterRole",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      avatar: {
        type: Sequelize.STRING(255),
      },
      isactive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("masterUser");
  },
};
