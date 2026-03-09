"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("platformTransfers", {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            transactionId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: { model: "transactions", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            },
            transactionItemId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: { model: "transactionItems", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
            },
            orderId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: "orders", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            locationId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: "masterLocation", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            xenditAccountId: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            amount: {
                type: Sequelize.DECIMAL(18, 2),
                allowNull: false,
            },
            platformFee: {
                type: Sequelize.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
            },
            xenditTransferId: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
            reference: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
            },
            transferType: {
                type: Sequelize.STRING(30),
                allowNull: false,
                comment: "PRODUCT_DELIVERED or VOUCHER_REDEEM",
            },
            status: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: "PENDING",
            },
            xenditResponse: {
                type: Sequelize.JSON,
                allowNull: true,
            },
            errorMessage: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            retryCount: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("platformTransfers");
    },
};
