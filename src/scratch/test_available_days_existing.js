const adsService = require("../services/ads.service");
const { AdsConfig } = require("../models");

async function test() {
  const configs = await AdsConfig.findAll({ limit: 1 });
  if (configs.length === 0) {
    console.log("No configs in DB!");
    return;
  }
  const adsConfigId = configs[0].id;
  const month = 4;
  const year = 2026;

  console.log("Testing with EXISTING ID:", adsConfigId, "(", configs[0].type, ")");
  const result = await adsService.getAvailableDays(null, null, null, month, year, adsConfigId);
  console.log("Result:", JSON.stringify(result, null, 2));
}

test().catch(console.error);
