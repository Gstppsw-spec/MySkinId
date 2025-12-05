"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("relationshipServiceCategory", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      serviceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterService",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      subCategoryServiceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterSubCategoryService",
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

    await queryInterface.addIndex("relationshipServiceCategory", ["serviceId"]);
    await queryInterface.addIndex("relationshipServiceCategory", [
      "subCategoryServiceId",
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("relationshipServiceCategory");
  },
};
