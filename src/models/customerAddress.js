"use strict";

module.exports = (sequelize, DataTypes) => {
    const customerAddress = sequelize.define(
        "customerAddress",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            customerId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            label: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: "Rumah",
            },
            receiverName: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            receiverPhone: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            address: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            province: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            city: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            district: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            cityId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            postalCode: {
                type: DataTypes.STRING(10),
                allowNull: true,
            },
            isPrimary: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
        },
        {
            tableName: "customerAddress",
            timestamps: true,
            paranoid: true,
        }
    );

    customerAddress.associate = function (models) {
        customerAddress.belongsTo(models.masterCustomer, {
            foreignKey: "customerId",
            as: "customer"
        });
    };

    return customerAddress;
};
