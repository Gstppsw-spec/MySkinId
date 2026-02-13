"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("transactionItems", "voucherCode", {
            type: Sequelize.STRING(20),
            allowNull: true,
            after: "isShippingRequired",
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("transactionItems", "voucherCode");
    },
};
