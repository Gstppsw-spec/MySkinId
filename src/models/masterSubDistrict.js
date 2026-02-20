'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class masterSubDistrict extends Model {
        static associate(models) {
            // define association here
            masterSubDistrict.belongsTo(models.masterDistrict, {
                foreignKey: 'districtId',
                as: 'district'
            });
        }
    }
    masterSubDistrict.init({
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        districtId: DataTypes.UUID,
        name: DataTypes.STRING(100),
        zipCode: DataTypes.STRING(10),
        latitude: DataTypes.DECIMAL(10, 8),
        longitude: DataTypes.DECIMAL(11, 8)
    }, {
        sequelize,
        modelName: 'masterSubDistrict',
        tableName: 'masterSubDistrict',
        timestamps: true
    });
    return masterSubDistrict;
};
