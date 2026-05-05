"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterCustomer", "referralCode", {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn("masterCustomer", "referredBy", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "masterCustomer",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("masterCustomer", "referredBy");
    await queryInterface.removeColumn("masterCustomer", "referralCode");
  },
};
