'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class masterDistrict extends Model {
        static associate(models) {
            // define association here
            masterDistrict.belongsTo(models.masterCity, {
                foreignKey: 'cityId',
                as: 'city'
            });
        }
    }
    masterDistrict.init({
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        cityId: DataTypes.UUID,
        name: DataTypes.STRING(100),
        latitude: DataTypes.DECIMAL(10, 7),
        longitude: DataTypes.DECIMAL(10, 7)
    }, {
        sequelize,
        modelName: 'masterDistrict',
        tableName: 'masterDistrict',
        timestamps: true
    });
    return masterDistrict;
};
