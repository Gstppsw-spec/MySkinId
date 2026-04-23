"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("customerClaimedVouchers", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "masterCustomer", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      voucherId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "vouchers", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM("CLAIMED", "USED", "EXPIRED"),
        allowNull: false,
        defaultValue: "CLAIMED",
      },
      claimedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      usedAt: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex("customerClaimedVouchers", ["customerId"]);
    await queryInterface.addIndex("customerClaimedVouchers", ["voucherId"]);
    await queryInterface.addIndex("customerClaimedVouchers", ["customerId", "voucherId"], {
      unique: true,
      name: "customer_voucher_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("customerClaimedVouchers");
  },
};
