"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Drop FK constraint that references packageId -> masterPackage.id
    await queryInterface.removeConstraint("customerVouchers", "customerVouchers_ibfk_2");

    // 2. Drop the index on packageId
    await queryInterface.removeIndex("customerVouchers", "packageId");

    // 3. Rename packageId -> referenceId
    await queryInterface.renameColumn("customerVouchers", "packageId", "referenceId");

    // 4. Add referenceType column (default 'package' for existing data)
    await queryInterface.addColumn("customerVouchers", "referenceType", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "package",
    });
  },

  async down(queryInterface, Sequelize) {
    // 1. Remove referenceType column
    await queryInterface.removeColumn("customerVouchers", "referenceType");

    // 2. Rename referenceId -> packageId
    await queryInterface.renameColumn("customerVouchers", "referenceId", "packageId");

    // 3. Re-add index
    await queryInterface.addIndex("customerVouchers", ["packageId"]);

    // 4. Re-add FK constraint
    await queryInterface.addConstraint("customerVouchers", {
      fields: ["packageId"],
      type: "foreign key",
      name: "customerVouchers_ibfk_2",
      references: {
        table: "masterPackage",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },
};
