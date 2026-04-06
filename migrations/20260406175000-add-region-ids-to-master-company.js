"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("masterCompany", "provinceId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn("masterCompany", "cityId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn("masterCompany", "districtId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn("masterCompany", "subDistrictId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("masterCompany", "provinceId");
    await queryInterface.removeColumn("masterCompany", "cityId");
    await queryInterface.removeColumn("masterCompany", "districtId");
    await queryInterface.removeColumn("masterCompany", "subDistrictId");
  },
};
