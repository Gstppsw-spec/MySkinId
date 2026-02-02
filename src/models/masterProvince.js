'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class masterProvince extends Model {
        static associate(models) {
            // define association here
            masterProvince.hasMany(models.masterCity, {
                foreignKey: 'provinceId',
                as: 'cities'
            });
        }
    }
    masterProvince.init({
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: DataTypes.STRING(100)
    }, {
        sequelize,
        modelName: 'masterProvince',
        tableName: 'masterProvince',
        timestamps: true
    });
    return masterProvince;
};
