"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterProduct", "locationId", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn("masterProduct", "weightGram", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("masterProduct", "lengthCm", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("masterProduct", "widthCm", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("masterProduct", "heightCm", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // FK boleh ditunda kalau data lama belum siap
    await queryInterface.addConstraint("masterProduct", {
      fields: ["locationId"],
      type: "foreign key",
      name: "fk_masterProduct_location",
      references: {
        table: "masterLocation",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      "masterProduct",
      "fk_masterProduct_location"
    );
    await queryInterface.removeColumn("masterProduct", "locationId");
    await queryInterface.removeColumn("masterProduct", "weightGram");
    await queryInterface.removeColumn("masterProduct", "lengthCm");
    await queryInterface.removeColumn("masterProduct", "widthCm");
    await queryInterface.removeColumn("masterProduct", "heightCm");
  },
};
