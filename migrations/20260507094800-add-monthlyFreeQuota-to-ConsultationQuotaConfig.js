"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ConsultationQuotaConfigs", "monthlyFreeQuota", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      after: "bonusQuota"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("ConsultationQuotaConfigs", "monthlyFreeQuota");
  },
};
