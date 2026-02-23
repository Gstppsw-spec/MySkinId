'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class masterPaymentMethod extends Model {
    static associate(models) {
      // define association here if any
    }
  }
  masterPaymentMethod.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: DataTypes.STRING,
    name: DataTypes.STRING,
    type: DataTypes.STRING,
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    logoUrl: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'masterPaymentMethod',
    tableName: 'masterPaymentMethod',
    timestamps: true,
    paranoid: true
  });
  return masterPaymentMethod;
};