"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterProduct", "function", {
      type: Sequelize.TEXT,
      defaultValue: true,
    });

    await queryInterface.addColumn("masterProduct", "compotition", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("masterProduct", "dose", {
      type: Sequelize.TEXT,
      defaultValue: true,
    });

    await queryInterface.addColumn("masterProduct", "rulesOfUse", {
      type: Sequelize.TEXT,
      defaultValue: true,
    });

    await queryInterface.addColumn("masterProduct", "attention", {
      type: Sequelize.TEXT,
      defaultValue: true,
    });

    await queryInterface.addColumn("masterProduct", "packaging", {
      type: Sequelize.STRING(255),
      defaultValue: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("masterProduct", "function");
    await queryInterface.removeColumn("masterProduct", "compotition");
    await queryInterface.removeColumn("masterProduct", "dose");
    await queryInterface.removeColumn("masterProduct", "rulesOfUse");
    await queryInterface.removeColumn("masterProduct", "attention");
    await queryInterface.removeColumn("masterProduct", "packaging");
  },
};
