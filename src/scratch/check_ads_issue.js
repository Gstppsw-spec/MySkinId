const { AdsPurchase, AdsConfig } = require("../models");
const { Op } = require("sequelize");

async function check() {
  const adsConfigId = "13597bc2-690f-4482-aae5-05cdc04b4422";
  const month = 4;
  const year = 2026;

  const config = await AdsConfig.findByPk(adsConfigId);
  console.log("Config Found:", JSON.stringify(config, null, 2));

  if (!config) {
    console.log("Config not found!");
    return;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  console.log("Check Range:", startDate.toISOString(), "to", endDate.toISOString());

  const purchases = await AdsPurchase.findAll({
    where: {
      adsType: config.type,
      configId: adsConfigId
    }
  });

  console.log(`Total Purchases for this config: ${purchases.length}`);
  purchases.forEach(p => {
    console.log(`- ID: ${p.id}, Status: ${p.status}, Active: ${p.isActive}, Start: ${p.startDate}, End: ${p.endDate}`);
  });

  const activePurchases = await AdsPurchase.findAll({
    where: {
      adsType: config.type,
      status: "PAID",
      isActive: true,
      configId: adsConfigId
    }
  });
  console.log(`Total PAID & Active Purchases: ${activePurchases.length}`);
}

check().catch(console.error);
