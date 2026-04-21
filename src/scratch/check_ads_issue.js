const { AdsConfig, AdsPurchase } = require("../models");

async function check() {
  const adsConfigId = "13597bc2-690f-4482-aae5-05cdc04b4422";
  const config = await AdsConfig.findByPk(adsConfigId);
  console.log("Config:", JSON.stringify(config, null, 2));

  if (!config) return;

  const purchases = await AdsPurchase.findAll({
    where: {
      configId: adsConfigId
    }
  });
  console.log("Purchases for this ID:", JSON.stringify(purchases, null, 2));

  const allPurchases = await AdsPurchase.findAll({
    where: {
      adsType: config.type,
      status: ["PENDING", "PAID"]
    }
  });
  console.log("All relevant type purchases:", JSON.stringify(allPurchases, null, 2));
}

check().catch(console.error);
