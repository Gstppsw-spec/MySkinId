"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add flashSaleItemId to customerCart
    try {
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
    } catch (error) {
      console.log("Column flashSaleItemId in customerCart might already exist, skipping...");
    }

    // Add flashSaleItemId to transactionItems
    try {
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
    } catch (error) {
      console.log("Column flashSaleItemId in transactionItems might already exist, skipping...");
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn("customerCart", "flashSaleItemId");
    } catch (error) {}
    try {
      await queryInterface.removeColumn("transactionItems", "flashSaleItemId");
    } catch (error) {}
  },
};
