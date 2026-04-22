"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. vouchers
    await queryInterface.createTable("vouchers", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      discountType: {
        type: Sequelize.ENUM("PERCENTAGE", "FIXED"),
        allowNull: false,
      },
      discountValue: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
      },
      minPurchase: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      maxDiscount: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },
      quota: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      usedCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      perUserLimit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("ACTIVE", "INACTIVE", "EXPIRED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      createdByType: {
        type: Sequelize.ENUM("SUPER_ADMIN", "COMPANY_ADMIN"),
        allowNull: false,
      },
      createdById: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      companyId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "masterCompany", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      myskinSharePercent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      mitraSharePercent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 100,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // 2. voucherItems
    await queryInterface.createTable("voucherItems", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      voucherId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "vouchers", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      itemType: {
        type: Sequelize.ENUM("PRODUCT", "PACKAGE", "SERVICE"),
        allowNull: false,
      },
      itemId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // 3. voucherUsages
    await queryInterface.createTable("voucherUsages", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      voucherId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "vouchers", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "masterCustomer", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "orders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      discountAmount: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      myskinSubsidy: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      mitraSubsidy: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Indexes
    await queryInterface.addIndex("voucherItems", ["voucherId"]);
    await queryInterface.addIndex("voucherItems", ["itemType", "itemId"]);
    await queryInterface.addIndex("voucherUsages", ["voucherId"]);
    await queryInterface.addIndex("voucherUsages", ["customerId"]);
    await queryInterface.addIndex("voucherUsages", ["orderId"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("voucherUsages");
    await queryInterface.dropTable("voucherItems");
    await queryInterface.dropTable("vouchers");
  },
};
