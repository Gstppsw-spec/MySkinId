"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("masterCompany", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },

      name: { type: Sequelize.STRING(150), allowNull: false },
      code: { type: Sequelize.STRING(50) },
      address: { type: Sequelize.STRING(255) },
      city: { type: Sequelize.STRING(100) },
      province: { type: Sequelize.STRING(100) },
      district: { type: Sequelize.STRING(100) },
      subDistrict: { type: Sequelize.STRING(100) },
      postalCode: { type: Sequelize.STRING(10) },

      phone: { type: Sequelize.STRING(20) },
      fax: { type: Sequelize.STRING(20) },
      email: { type: Sequelize.STRING(150) },
      websiteUrl: { type: Sequelize.STRING(255) },

      // Legal info
      npwp: { type: Sequelize.STRING(30) },
      nib: { type: Sequelize.STRING(50) },
      siup: { type: Sequelize.STRING(50) },
      taxStatus: { type: Sequelize.STRING(50) }, // PKP / NON-PKP

      // Branding
      logo: { type: Sequelize.STRING(255) },

      // Finance
      bankName: { type: Sequelize.STRING(100) },
      bankAccountName: { type: Sequelize.STRING(100) },
      bankAccountNumber: { type: Sequelize.STRING(50) },
      currency: { type: Sequelize.STRING(10), defaultValue: "IDR" },

      // Operational
      timezone: { type: Sequelize.STRING(50), defaultValue: "Asia/Jakarta" },
      locale: { type: Sequelize.STRING(10), defaultValue: "id-ID" },

      // Audit trail
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

      // Soft delete + timestamps
      isactive: { type: Sequelize.BOOLEAN, defaultValue: false },
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("masterCompany");
  },
};
