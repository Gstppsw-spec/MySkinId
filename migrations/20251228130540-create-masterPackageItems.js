"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("masterPackageItems", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      packageId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      serviceId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      qty: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addConstraint("masterPackageItems", {
      fields: ["packageId"],
      type: "foreign key",
      name: "fk_masterPackageItems_package",
      references: {
        table: "masterPackage",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    await queryInterface.addConstraint("masterPackageItems", {
      fields: ["serviceId"],
      type: "foreign key",
      name: "fk_masterPackageItems_service",
      references: {
        table: "masterService",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      "masterPackageItems",
      "fk_masterPackageItems_service"
    );
    await queryInterface.removeConstraint(
      "masterPackageItems",
      "fk_masterPackageItems_package"
    );
    await queryInterface.dropTable("masterPackageItems");
  },
};
