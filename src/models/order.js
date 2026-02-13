"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class order extends Model {
        static associate(models) {
            order.belongsTo(models.masterCustomer, {
                foreignKey: "customerId",
                as: "customer",
            });
            order.hasMany(models.transaction, {
                foreignKey: "orderId",
                as: "transactions",
            });
            order.hasMany(models.orderPayment, {
                foreignKey: "orderId",
                as: "payments",
            });
        }
    }

    order.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            orderNumber: {
                type: DataTypes.STRING(30),
                allowNull: false,
                unique: true,
            },
            customerId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            totalAmount: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
            },
            paymentStatus: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "UNPAID",
            },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
        },
        {
            sequelize,
            modelName: "order",
            tableName: "orders",
            timestamps: true,
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        }
    );

    return order;
};
