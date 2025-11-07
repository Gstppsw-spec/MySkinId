require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_SERVER || '127.0.0.1',
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: console.log, // ubah ke false kalau tidak mau lihat log query
    dialectOptions: {
      multipleStatements: true,
    },
  }
);

sequelize.authenticate()
  .then(() => console.log('✅ Connected to MySQL (Local)'))
  .catch(err => console.error('❌ Connection failed:', err));

module.exports = sequelize;
