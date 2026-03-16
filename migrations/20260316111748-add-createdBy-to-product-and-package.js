"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterProduct", "createdBy", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "masterUser",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("masterPackage", "createdBy", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "masterUser",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("masterProduct", "createdBy");
    await queryInterface.removeColumn("masterPackage", "createdBy");
  },
};
