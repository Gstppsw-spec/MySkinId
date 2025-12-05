"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    await queryInterface.bulkInsert("masterConsultationCategory", [
      {
        id: uuidv4(),
        name: "Skincare Facial",
        description: "Perawatan wajah menggunakan produk skincare khusus",
        iconUrl: "https://cdn-icons-png.flaticon.com/512/2922/2922560.png",
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        name: "Body Treatment",
        description: "Perawatan tubuh, massage, dan perawatan kulit",
        iconUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        name: "Hair Care",
        description: "Perawatan rambut dan kulit kepala",
        iconUrl: "https://cdn-icons-png.flaticon.com/512/2922/2922562.png",
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: uuidv4(),
        name: "Consultation Only",
        description: "Kategori untuk konsultasi tanpa treatment langsung",
        iconUrl: "https://cdn-icons-png.flaticon.com/512/2910/2910762.png",
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("masterConsultationCategory", null, {});
  },
};
