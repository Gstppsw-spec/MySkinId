"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("masterService", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      compotition: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      postTreatmentCare: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      contraIndication: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      securityAndCertification: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      durationOfResults: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      indicationOfUse: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      benefit: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
      normalPrice: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discountPercent: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      discountValue: {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
      },
      finalPrice: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      imageUrl: {
        type: Sequelize.STRING(255),
        allowNull: false,
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
      },
    });

    await queryInterface.addIndex("masterService", ["name"]);
    await queryInterface.addIndex("masterService", ["locationId"]);
    await queryInterface.addIndex("masterService", ["id"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("masterService");
  },
};
