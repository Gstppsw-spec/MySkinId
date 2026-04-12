"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class customerVoucher extends Model {
        static associate(models) {
            customerVoucher.belongsTo(models.masterCustomer, {
                foreignKey: "customerId",
                as: "customer",
            });
            customerVoucher.belongsTo(models.masterPackage, {
                foreignKey: "referenceId",
                as: "package",
                constraints: false,
            });
            customerVoucher.belongsTo(models.masterService, {
                foreignKey: "referenceId",
                as: "service",
                constraints: false,
            });
            customerVoucher.belongsTo(models.transactionItem, {
                foreignKey: "transactionItemId",
                as: "transactionItem",
            });
        }
    }

    customerVoucher.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            customerId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            referenceId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            referenceType: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "package",
            },
            transactionItemId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            voucherCode: {
                type: DataTypes.STRING(20),
                allowNull: false,
                unique: true,
            },
            status: {
                type: DataTypes.STRING(20),
                defaultValue: "BOOKED", // BOOKED / REDEEM / EXPIRED
            },
            expiredAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
        },
        {
            sequelize,
            modelName: "customerVoucher",
            tableName: "customerVouchers",
            timestamps: true,
        }
    );

    return customerVoucher;
};
