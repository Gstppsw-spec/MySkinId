"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class transactionShipping extends Model {
        static associate(models) {
            transactionShipping.belongsTo(models.transaction, {
                foreignKey: "transactionId",
                as: "transaction",
            });
        }
    }

    transactionShipping.init(
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
            receiverName: DataTypes.STRING(100),
            receiverPhone: DataTypes.STRING(20),
            address: DataTypes.STRING(255),
            originCityId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            destinationCityId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            totalWeight: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            courierCode: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },
            courierService: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            shippingCost: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
            },
            estimatedDelivery: {
                type: DataTypes.STRING(20),
            },
            shippingStatus: {
                type: DataTypes.STRING(20),
                defaultValue: "PENDING",
            },
            rajaOngkirResponse: {
                type: DataTypes.JSON,
            },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
        },
        {
            sequelize,
            modelName: "transactionShipping",
            tableName: "transactionShipping",
            timestamps: true,
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        }
    );

    return transactionShipping;
};
