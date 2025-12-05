"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    // Ambil produk yang isPrescriptionRequired = true
    const [products] = await queryInterface.sequelize.query(
      `SELECT id, name FROM masterProduct WHERE isPrescriptionRequired = true`
    );

    // Ambil semua kategori konsultasi
    const [categories] = await queryInterface.sequelize.query(
      `SELECT id, name FROM masterConsultationCategory`
    );

    // Buat mapping nama → id
    const categoryMap = {};
    categories.forEach((c) => (categoryMap[c.name] = c.id));

    // Contoh mapping produk ke kategori konsultasi
    // Hanya produk resep yang dimasukkan
    const pivotData = [
      {
        productName: "Retinol Cream",
        consultationCategoryName: "Skincare Facial",
      },
      // Bisa tambah mapping lain sesuai kebutuhan
    ];

    const bulkInsertData = pivotData
      .map((item) => {
        const product = products.find((p) => p.name === item.productName);
        if (!product) return null; // skip jika produk tidak ditemukan

        return {
          id: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
          productId: product.id,
          consultationCategoryId: categoryMap[item.consultationCategoryName],
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      })
      .filter(Boolean);

    await queryInterface.bulkInsert(
      "relationshipProductConsultationCategory",
      bulkInsertData
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      "relationshipProductConsultationCategory",
      null,
      {}
    );
  },
};
