"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    // Ambil semua produk
    const [products] = await queryInterface.sequelize.query(
      `SELECT id, name FROM masterProduct`
    );

    // Ambil semua kategori konsultasi
    const [categories] = await queryInterface.sequelize.query(
      `SELECT id, name FROM masterConsultationCategory`
    );

    // Buat mapping nama → id
    const categoryMap = {};
    categories.forEach((c) => (categoryMap[c.name] = c.id));

    // Mapping produk ke kategori konsultasi (1 product bisa punya beberapa kategori)
    const pivotData = [
      { productName: "Hydrating Serum", consultationCategoryName: "Skincare Facial" },
      { productName: "Hydrating Serum", consultationCategoryName: "Consultation Only" },
      { productName: "Vitamin C Toner", consultationCategoryName: "Skincare Facial" },
      { productName: "Clay Face Mask", consultationCategoryName: "Skincare Facial" },
      { productName: "Clay Face Mask", consultationCategoryName: "Body Treatment" },
      { productName: "Retinol Cream", consultationCategoryName: "Skincare Facial" },
      { productName: "Retinol Cream", consultationCategoryName: "Consultation Only" },
      { productName: "Sunscreen SPF 50", consultationCategoryName: "Skincare Facial" },
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
