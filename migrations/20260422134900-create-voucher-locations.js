"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("voucherLocations", {
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
      locationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "masterLocation", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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

    await queryInterface.addIndex("voucherLocations", ["voucherId"]);
    await queryInterface.addIndex("voucherLocations", ["locationId"]);
    await queryInterface.addIndex("voucherLocations", ["voucherId", "locationId"], {
      unique: true,
      name: "voucher_location_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("voucherLocations");
  },
};
