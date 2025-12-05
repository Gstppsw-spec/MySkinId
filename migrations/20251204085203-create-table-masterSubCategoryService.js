"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("masterSubCategoryService", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      mainCategoryServiceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterMainCategoryService",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      }
    });

    await queryInterface.addIndex("masterSubCategoryService", ["name"]);
    await queryInterface.addIndex("masterSubCategoryService", ["mainCategoryServiceId"]);
  },

  

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("masterSubCategoryService");
  },
};
