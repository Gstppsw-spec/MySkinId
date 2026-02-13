"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class transactionItem extends Model {
        static associate(models) {
            transactionItem.belongsTo(models.transaction, {
                foreignKey: "transactionId",
                as: "transaction",
            });
        }
    }

    transactionItem.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            transactionId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            itemType: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },
            itemId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            itemName: {
                type: DataTypes.STRING(150),
                allowNull: false,
            },
            locationId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            quantity: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            unitPrice: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
            },
            discountAmount: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
            },
            totalPrice: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
            },
            isShippingRequired: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            voucherCode: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
        },
        {
            sequelize,
            modelName: "transactionItem",
            tableName: "transactionItems",
            timestamps: true,
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        }
    );

    return transactionItem;
};
