const { AdsPurchase } = require("../models");

async function check() {
  const purchases = await AdsPurchase.findAll({
    attributes: ["configId"],
    group: ["configId"]
  });
  console.log("Distinct configIds in AdsPurchase:", JSON.stringify(purchases, null, 2));
}

check().catch(console.error);
