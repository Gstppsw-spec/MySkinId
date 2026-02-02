"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    /* 1️⃣ Rename normalPrice → price */
    await queryInterface.renameColumn(
      "masterService",
      "normalPrice",
      "price"
    );

    /* 2️⃣ Hapus kolom yang tidak dipakai */
    await queryInterface.removeColumn("masterService", "discountValue");
    await queryInterface.removeColumn("masterService", "finalPrice");
    await queryInterface.removeColumn("masterService", "imageUrl");
  },

  async down(queryInterface, Sequelize) {
    /* 3️⃣ Balikin kolom yang dihapus */
    await queryInterface.addColumn("masterService", "imageUrl", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

    await queryInterface.addColumn("masterService", "finalPrice", {
      type: Sequelize.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("masterService", "discountValue", {
      type: Sequelize.DECIMAL(18, 2),
      defaultValue: 0,
    });

    /* 4️⃣ Rename price → normalPrice */
    await queryInterface.renameColumn(
      "masterService",
      "price",
      "normalPrice"
    );
  },
};
