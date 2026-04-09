"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create companyAdsBalance table
    await queryInterface.createTable("companyAdsBalance", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      companyId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "masterCompany",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      balance: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      lastTopupAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // 2. Create companyAdsBalanceHistory table
    await queryInterface.createTable("companyAdsBalanceHistory", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      balanceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "companyAdsBalance",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM("TOPUP", "SPEND", "INITIAL_GRANT"),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true, // Link to orderId or purchaseId
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("companyAdsBalanceHistory");
    await queryInterface.dropTable("companyAdsBalance");
  },
};
