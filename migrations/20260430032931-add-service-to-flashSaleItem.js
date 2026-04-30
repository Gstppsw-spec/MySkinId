"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add serviceId column
    await queryInterface.addColumn("flashSaleItem", "serviceId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "masterService",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "packageId"
    });

    // 2. Change itemType ENUM to include SERVICE
    // Note: In MySQL, changeColumn for ENUM works but sometimes requires raw query if it's already used.
    // We'll use the Sequelize way first.
    await queryInterface.changeColumn("flashSaleItem", "itemType", {
      type: Sequelize.ENUM("PRODUCT", "PACKAGE", "SERVICE"),
      allowNull: false,
      defaultValue: "PRODUCT",
    });
  },

  async down(queryInterface, Sequelize) {
    // 1. Revert itemType ENUM
    // Note: Reverting ENUM might fail if there's already 'SERVICE' data.
    await queryInterface.changeColumn("flashSaleItem", "itemType", {
      type: Sequelize.ENUM("PRODUCT", "PACKAGE"),
      allowNull: false,
      defaultValue: "PRODUCT",
    });

    // 2. Remove serviceId column
    await queryInterface.removeColumn("flashSaleItem", "serviceId");
  },
};
