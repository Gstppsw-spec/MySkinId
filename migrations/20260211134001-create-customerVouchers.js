"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("customerVouchers", {
            id: {
                allowNull: false,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            customerId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "masterCustomer",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            packageId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "masterPackage",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            transactionItemId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "transactionItems",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            voucherCode: {
                type: Sequelize.STRING(20),
                allowNull: false,
                unique: true,
            },
            status: {
                type: Sequelize.STRING(20),
                defaultValue: "ACTIVE",
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("customerVouchers");
    },
};
