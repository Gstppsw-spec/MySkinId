const { AdsConfig } = require("../models");

async function check() {
  const configs = await AdsConfig.findAll({
    attributes: ["id", "type", "position", "slideNumber"]
  });
  console.log("All AdsConfigs:", JSON.stringify(configs, null, 2));
}

check().catch(console.error);
