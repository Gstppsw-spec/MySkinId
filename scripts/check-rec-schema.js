const { sequelize } = require("./src/models");

async function checkSchema() {
  try {
    const [results] = await sequelize.query("DESCRIBE consultationRecommendationCategory");
    console.log("Table consultationRecommendationCategory structure:");
    console.table(results);
    
    const [results2] = await sequelize.query("DESCRIBE consultationRecommendation");
    console.log("Table consultationRecommendation structure:");
    console.table(results2);
    
    process.exit(0);
  } catch (error) {
    console.error("Error checking schema:", error.message);
    process.exit(1);
  }
}

checkSchema();
