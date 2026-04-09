"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("adsPurchase", "referenceType", {
      type: Sequelize.ENUM("OUTLET", "PRODUCT", "PACKAGE", "SERVICE", "EXTERNAL"),
      allowNull: true,
      defaultValue: "OUTLET"
    });

    await queryInterface.addColumn("adsPurchase", "referenceId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("adsPurchase", "referenceType");
    await queryInterface.removeColumn("adsPurchase", "referenceId");
    // Note: ENUM might need manual removal in some DBs, but this is standard for most.
  },
};
