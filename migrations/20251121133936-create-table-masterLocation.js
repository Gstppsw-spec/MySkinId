"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("masterLocation", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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

      name: { type: Sequelize.STRING(150), allowNull: false },
      code: { type: Sequelize.STRING(50) },

      // Address detail
      address: { type: Sequelize.STRING(255) },
      province: { type: Sequelize.STRING(100) },
      district: { type: Sequelize.STRING(100) },
      subdistrict: { type: Sequelize.STRING(100) },
      postalCode: { type: Sequelize.STRING(10) },

      cityId: { type: Sequelize.INTEGER },

      // Geolocation
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },

      // Contact
      phone: { type: Sequelize.STRING(20) },
      email: { type: Sequelize.STRING(150) },

      // Operation
      operationHours: { type: Sequelize.STRING(50) },
      operationDays: { type: Sequelize.STRING(100) },
      timezone: { type: Sequelize.STRING(50), defaultValue: "Asia/Jakarta" },

      // Finance
      bankName: { type: Sequelize.STRING(100) },
      bankAccountName: { type: Sequelize.STRING(100) },
      bankAccountNumber: { type: Sequelize.STRING(50) },

      // Audit
      createdBy: {
        type: Sequelize.UUID,
        references: { model: "masterUser", key: "id" },
      },
      updatedBy: {
        type: Sequelize.UUID,
        references: { model: "masterUser", key: "id" },
      },
      deletedBy: {
        type: Sequelize.UUID,
        references: { model: "masterUser", key: "id" },
      },

      isactive: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      deletedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("masterLocation");
  },
};
