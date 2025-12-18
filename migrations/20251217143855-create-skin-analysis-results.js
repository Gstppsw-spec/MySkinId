"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("customer_skin_analysis_results", {
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
      imageUrl: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      rawResponse: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      acneScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      wrinkleScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      oilScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      skinType: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      severity: {
        type: Sequelize.STRING(20),
        allowNull: true,
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
    await queryInterface.dropTable("customer_skin_analysis_results");
  },
};
