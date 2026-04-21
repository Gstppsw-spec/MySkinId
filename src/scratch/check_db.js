const { sequelize } = require("../models");

async function checkSchema() {
  try {
    const [results] = await sequelize.query("SHOW TABLES");
    console.log("Tables in database:", results);

    const [cols] = await sequelize.query("DESCRIBE ConsultationQuotaConfigs");
    console.log("Columns in ConsultationQuotaConfigs:", cols);
  } catch (error) {
    console.error("Error checking schema:", error.message);
  } finally {
    process.exit();
  }
}

checkSchema();
