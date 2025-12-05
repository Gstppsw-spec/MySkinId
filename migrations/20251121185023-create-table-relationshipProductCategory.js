"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("relationshipProductCategory", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterProduct",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      productCategoryId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterProductCategory",
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

    await queryInterface.addIndex("relationshipProductCategory", ["productId"]);
    await queryInterface.addIndex("relationshipProductCategory", ["productCategoryId"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("relationshipProductCategory");
  },
};
