"use strict";
module.exports = (sequelize, DataTypes) => {
  const masterCustomer = sequelize.define(
    "masterCustomer",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      // ===== LOGIN IDENTIFIERS =====
      email: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: true,
      },
      phoneNumber: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: true,
      },
      countryCode: {
        type: DataTypes.STRING(5),
        defaultValue: "+62",
      },
      googleId: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: true,
      },

      // ===== LOGIN META =====
      loginMethod: {
        type: DataTypes.ENUM("phone", "email", "google"),
        allowNull: false,
        defaultValue: "phone",
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      jwtToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // ===== VERIFICATION =====
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      phoneVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      // ===== OTP (optional) =====
      otpCode: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      otpExpiredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      otpType: DataTypes.ENUM("email", "phone", "reset", "login"),

      // ===== PROFILE =====
      profileImageUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      // ===== STATUS =====
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "masterCustomer",
      timestamps: true,
    }
  );

  return masterCustomer;
};
