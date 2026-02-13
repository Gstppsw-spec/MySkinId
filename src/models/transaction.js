"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class transaction extends Model {
        static associate(models) {
            transaction.belongsTo(models.order, {
                foreignKey: "orderId",
                as: "order",
            });
            transaction.hasMany(models.transactionItem, {
                foreignKey: "transactionId",
                as: "items",
            });
            transaction.hasOne(models.transactionShipping, {
                foreignKey: "transactionId",
                as: "shipping",
            });
            transaction.belongsTo(models.masterLocation, {
                foreignKey: "locationId",
                as: "location",
            });
        }
    }

    transaction.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            orderId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            transactionNumber: {
                type: DataTypes.STRING(30),
                allowNull: false,
                unique: true,
            },
            locationId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            subTotal: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
            },
            discountAmount: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
            },
            taxAmount: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
            },
            shippingFee: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
            },
            grandTotal: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
            },
            orderStatus: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "CREATED",
            },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
        },
        {
            sequelize,
            modelName: "transaction",
            tableName: "transactions",
            timestamps: true,
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        }
    );

    return transaction;
};
