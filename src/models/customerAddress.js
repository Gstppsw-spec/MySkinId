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
            subDistrict: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            cityId: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            districtId: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            postalCode: {
                type: DataTypes.STRING(10),
                allowNull: true,
            },
            biteshipAreaId: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            latitude: {
                type: DataTypes.DECIMAL(10, 7),
                allowNull: true,
            },
            longitude: {
                type: DataTypes.DECIMAL(10, 7),
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
