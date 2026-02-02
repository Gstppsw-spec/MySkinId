const db = require('./src/models');

async function checkSchema() {
    try {
        const tableName = 'masterCustomer';
        const columnName = 'id';

        const query = `
      SELECT 
        COLUMN_NAME, 
        COLUMN_TYPE, 
        CHARACTER_SET_NAME, 
        COLLATION_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE 
        TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = '${tableName}' 
        AND COLUMN_NAME = '${columnName}'
    `;

        const [results] = await db.sequelize.query(query);
        console.log('Schema Info:', JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSchema();
