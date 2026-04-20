const adsService = require("../services/ads.service");

async function test() {
  const adsConfigId = "13597bc2-690f-4482-aae5-05cdc04b4422";
  const month = 4;
  const year = 2026;

  console.log("Testing with ID:", adsConfigId);
  const result = await adsService.getAvailableDays(null, null, null, month, year, adsConfigId);
  console.log("Result:", JSON.stringify(result, null, 2));
}

test().catch(console.error);
