"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add flashSaleItemId to customerCart
    await queryInterface.addColumn("customerCart", "flashSaleItemId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "flashSaleItem",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Add flashSaleItemId to transactionItems
    await queryInterface.addColumn("transactionItems", "flashSaleItemId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "flashSaleItem",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("customerCart", "flashSaleItemId");
    await queryInterface.removeColumn("transactionItems", "flashSaleItemId");
  },
};
