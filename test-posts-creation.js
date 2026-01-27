const db = require('./src/models');

async function testPostsCreation() {
    try {
        console.log('Testing posts table creation...');

        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS posts (
        id CHAR(36) NOT NULL PRIMARY KEY,
        userId CHAR(36) NOT NULL,
        caption TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES masterCustomer(id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `;

        await db.sequelize.query(createTableSQL);
        console.log('Posts table created successfully!');

        // Add index
        await db.sequelize.query('CREATE INDEX idx_posts_userId ON posts(userId)');
        console.log('Index created successfully!');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

testPostsCreation();
