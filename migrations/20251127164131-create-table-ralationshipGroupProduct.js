"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("relationshipGroupProduct", {
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
      groupId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterGroupProduct",
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

    await queryInterface.addIndex("relationshipGroupProduct", ["productId"]);
    await queryInterface.addIndex("relationshipGroupProduct", ["groupId"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("relationshipGroupProduct");
  },
};
