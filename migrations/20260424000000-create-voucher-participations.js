"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("voucherParticipations", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      voucherId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "vouchers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      status: {
        type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
        defaultValue: "ACTIVE",
        allowNull: false,
      },
      isAllItems: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
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

    // Composite unique constraint to prevent duplicate participation
    await queryInterface.addConstraint("voucherParticipations", {
      fields: ["voucherId", "companyId"],
      type: "unique",
      name: "unique_voucher_company_participation",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("voucherParticipations");
  },
};
