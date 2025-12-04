"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("masterProduct", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      sku: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      discountPercent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: "Persentase diskon produk, misal 10 = 10%",
      },
      isPrescriptionRequired: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex("masterProduct", ["name"]);
    await queryInterface.addIndex("masterProduct", ["sku"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("masterProduct");
  },
};
