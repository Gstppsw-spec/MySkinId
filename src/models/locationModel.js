const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Mscompany = require('./companyModel');

const Mslocation = sequelize.define('Mslocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: { type: DataTypes.STRING(100), allowNull: false },
  code: { type: DataTypes.STRING(20) },
  companyid: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'mscompany',
      key: 'id',
    },
  },
  cityid: { type: DataTypes.INTEGER },
  address: { type: DataTypes.STRING(255) },
  latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  operation_hours: { type: DataTypes.STRING(50), allowNull: true },
  operation_days: { type: DataTypes.STRING(100), allowNull: true },
  isactive: { type: DataTypes.BOOLEAN, defaultValue: true },
  updatedate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updateuserid: { type: DataTypes.UUID },
}, {
  tableName: 'mslocation',
  timestamps: false,
});

Mslocation.belongsTo(Mscompany, { foreignKey: 'companyid', as: 'company' });
Mscompany.hasMany(Mslocation, { foreignKey: 'companyid', as: 'locations' });

module.exports = Mslocation;
