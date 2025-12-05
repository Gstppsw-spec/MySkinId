"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("masterCustomer", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },

      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      // ===== LOGIN IDs =====
      email: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      },

      phoneNumber: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true,
      },

      countryCode: {
        type: Sequelize.STRING(5),
        defaultValue: "+62",
      },

      googleId: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      },

      loginMethod: {
        type: Sequelize.ENUM("phone", "email", "google"),
        allowNull: false,
        defaultValue: "phone",
      },

      password: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      jwtToken: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // ===== VERIFICATIONS =====
      emailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },

      phoneVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },

      // ===== OTP =====
      otpCode: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },

      otpType: Sequelize.ENUM("email", "phone", "reset", "login"),

      otpExpiredAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // ===== PROFILE =====
      profileImageUrl: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      // ===== STATUS =====
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },

      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // ===== SYSTEM =====
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },

      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("masterCustomer");

    // DROP ENUM (MySQL BUTUH ini supa tidak error jika migrate ulang)
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS `enum_masterCustomer_loginMethod`;"
    );

    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS `enum_masterCustomer_otpType`;"
    );
  },
};
