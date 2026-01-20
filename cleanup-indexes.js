const db = require('./src/models');

async function dropSocialTables() {
    try {
        console.log('Dropping social media tables...');

        // Drop tables in reverse order of dependencies
        const tables = ['postComments', 'postLikes', 'postMedia', 'followers', 'posts'];

        for (const table of tables) {
            try {
                await db.sequelize.query(`DROP TABLE IF EXISTS ${table}`);
                console.log(`Dropped table: ${table}`);
            } catch (error) {
                console.log(`Error dropping ${table}:`, error.message);
            }
        }

        console.log('All social media tables dropped successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

dropSocialTables();
