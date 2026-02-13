"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class orderPayment extends Model {
        static associate(models) {
            orderPayment.belongsTo(models.order, {
                foreignKey: "orderId",
                as: "order",
            });
        }
    }

    orderPayment.init(
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
            paymentMethod: {
                type: DataTypes.STRING(30),
                allowNull: false,
            },
            amount: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
            },
            referenceNumber: {
                type: DataTypes.STRING(100),
            },
            paymentStatus: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "PENDING",
            },
            gatewayResponse: {
                type: DataTypes.JSON,
            },
            paymentDate: {
                type: DataTypes.DATE,
            },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
        },
        {
            sequelize,
            modelName: "orderPayment",
            tableName: "orderPayment",
            timestamps: true,
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        }
    );

    return orderPayment;
};
