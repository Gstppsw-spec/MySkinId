const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MsUserCustomer = sequelize.define('MsUserCustomer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(100), unique: true },
  phoneNumber: { type: DataTypes.STRING(20), unique: true }, 
  countryCode: { type: DataTypes.STRING(5), defaultValue: '+62' },
  googleId: { type: DataTypes.STRING(100), unique: true },
  password: { type: DataTypes.STRING(255) },
  jwtToken: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'msuser_customer',
  timestamps: true,
});

module.exports = MsUserCustomer;
