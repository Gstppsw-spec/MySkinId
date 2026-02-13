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
                foreignKey: "packageId",
                as: "package",
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
            packageId: {
                type: DataTypes.UUID,
                allowNull: false,
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
                defaultValue: "ACTIVE", // ACTIVE / CLAIMED / EXPIRED
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
