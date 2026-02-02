'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class masterCity extends Model {
        static associate(models) {
            // define association here
            masterCity.belongsTo(models.masterProvince, {
                foreignKey: 'provinceId',
                as: 'province'
            });
            masterCity.hasMany(models.masterDistrict, {
                foreignKey: 'cityId',
                as: 'districts'
            });
        }
    }
    masterCity.init({
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        provinceId: DataTypes.UUID,
        name: DataTypes.STRING(100),
        latitude: DataTypes.DECIMAL(10, 7),
        longitude: DataTypes.DECIMAL(10, 7)
    }, {
        sequelize,
        modelName: 'masterCity',
        tableName: 'masterCity',
        timestamps: true
    });
    return masterCity;
};
