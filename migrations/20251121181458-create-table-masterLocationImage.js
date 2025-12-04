"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("masterLocationImage", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      locationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterLocation",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      imageUrl: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    
    await queryInterface.addIndex("masterLocationImage", ["locationId"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("masterLocationImage");
  },
};
