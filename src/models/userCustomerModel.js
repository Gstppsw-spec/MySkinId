"use strict";

module.exports = (sequelize, DataTypes) => {
  const MsUserCustomer = sequelize.define(
    "MsUserCustomer",
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
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      jwtToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "msuser_customer",
      timestamps: true,
    }
  );

  // 🔗 Relasi bisa ditambahkan di sini bila ada, dipanggil via index.js
  MsUserCustomer.associate = (models) => {
    // Contoh: satu customer punya banyak consultation room
    MsUserCustomer.hasMany(models.ConsultationRoom, {
      foreignKey: "customerid",
      as: "consultationroom",
    });
  };

  return MsUserCustomer;
};

