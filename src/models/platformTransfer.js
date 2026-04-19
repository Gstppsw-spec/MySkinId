"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class platformTransfer extends Model {
        static associate(models) {
            platformTransfer.belongsTo(models.transaction, {
                foreignKey: "transactionId",
                as: "transaction",
            });
            platformTransfer.belongsTo(models.transactionItem, {
                foreignKey: "transactionItemId",
                as: "transactionItem",
            });
            platformTransfer.belongsTo(models.order, {
                foreignKey: "orderId",
                as: "order",
            });
            platformTransfer.belongsTo(models.masterLocation, {
                foreignKey: "locationId",
                as: "location",
            });
        }
    }

    platformTransfer.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            transactionId: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            transactionItemId: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            orderId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            locationId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            xenditAccountId: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            amount: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
            },
            platformFee: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
            },
            xenditTransferId: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            reference: {
                type: DataTypes.STRING(100),
                allowNull: false,
                unique: true,
            },
            transferType: {
                type: DataTypes.STRING(30),
                allowNull: false,
            },
            status: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "PENDING",
            },
            xenditResponse: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            errorMessage: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            retryCount: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            mdrFee: {
                type: DataTypes.DECIMAL(18, 2),
                allowNull: false,
                defaultValue: 0,
            },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
        },
        {
            sequelize,
            modelName: "platformTransfer",
            tableName: "platformTransfers",
            timestamps: true,
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        }
    );

    return platformTransfer;
};
