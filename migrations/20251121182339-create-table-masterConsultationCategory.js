"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("masterConsultationCategory", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      iconUrl: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: "URL atau path icon kategori",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW, // MySQL
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW, // MySQL
      },
    });

    await queryInterface.addIndex("masterConsultationCategory", ["name"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("masterConsultationCategory");
  },
};
