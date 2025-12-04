"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();

    // Ambil ID produk dan kategori dari database
    const [products] = await queryInterface.sequelize.query(
      `SELECT id, name FROM masterProduct`
    );
    const [categories] = await queryInterface.sequelize.query(
      `SELECT id, name FROM masterProductCategory`
    );

    // Buat mapping nama → id supaya gampang
    const productMap = {};
    products.forEach((p) => (productMap[p.name] = p.id));

    const categoryMap = {};
    categories.forEach((c) => (categoryMap[c.name] = c.id));

    // Siapkan data pivot
    const pivotData = [
      { productName: "Hydrating Serum", categoryName: "Serum" },
      { productName: "Vitamin C Toner", categoryName: "Toner" },
      { productName: "Clay Face Mask", categoryName: "Masker" },
      { productName: "Retinol Cream", categoryName: "Serum" },
      { productName: "Sunscreen SPF 50", categoryName: "Sunscreen" },
    ];

    // Mapping nama → UUID
    const bulkInsertData = pivotData.map((item, index) => ({
      id: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()), // generate UUID
      productId: productMap[item.productName],
      productCategoryId: categoryMap[item.categoryName],
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    await queryInterface.bulkInsert(
      "relationshipProductCategory",
      bulkInsertData
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("relationshipProductCategory", null, {});
  },
};
