"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add nonWithdrawableBalance to companyAdsBalance if not exists
    const tableInfo = await queryInterface.describeTable("companyAdsBalance");
    if (!tableInfo.nonWithdrawableBalance) {
      await queryInterface.addColumn("companyAdsBalance", "nonWithdrawableBalance", {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
        after: "balance",
      });
    }

    // 2. Create CompanyWithdrawals table
    await queryInterface.createTable("companyWithdrawals", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      companyId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "masterCompany",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      amount: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
      },
      bankName: {
        type: Sequelize.STRING(100),
      },
      bankAccountName: {
        type: Sequelize.STRING(100),
      },
      bankAccountNumber: {
        type: Sequelize.STRING(50),
      },
      status: {
        type: Sequelize.ENUM("PENDING", "SUCCESS", "FAILED"),
        defaultValue: "PENDING",
      },
      xenditId: {
        type: Sequelize.STRING(100),
      },
      errorMessage: {
        type: Sequelize.TEXT,
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("companyWithdrawals");
    await queryInterface.removeColumn("companyAdsBalance", "nonWithdrawableBalance");
  },
};
