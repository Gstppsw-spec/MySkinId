const { AdsPurchase, AdsConfig } = require("../models");
const adsService = require("../services/ads.service");

async function verify() {
  // 1. Get a random config
  const config = await AdsConfig.findOne();
  if (!config) {
    console.log("No config found!");
    return;
  }

  console.log("Using Config:", config.id, "(", config.type, ")");

  // 2. Create a PENDING ad for next month
  const { masterLocation } = require("../models");
  const loc = await masterLocation.findOne();
  if (!loc) {
    console.log("No location found!");
    return;
  }

  const startDate = new Date(2026, 3, 10); // April 10, 2026
  const endDate = new Date(2026, 3, 15);   // April 15, 2026

  const purchase = await AdsPurchase.create({
    locationId: loc.id,
    adsType: config.type,
    configId: config.id,
    startDate,
    endDate,
    status: "PENDING",
    isActive: false
  });

  console.log("Created PENDING Purchase:", purchase.id);

  // 3. Test API
  const result = await adsService.getAvailableDays(null, null, null, 4, 2026, config.id);
  
  const found = result.data.find(p => p.id === purchase.id);
  if (found) {
    console.log("SUCCESS: PENDING purchase found in available days.");
  } else {
    console.log("FAILURE: PENDING purchase NOT found.");
  }

  // Cleanup
  await purchase.destroy({ force: true });
  console.log("Cleanup done.");
}

verify().catch(console.error);
