const { AdsPurchase, sequelize } = require("../models");
const { Op } = require("sequelize");

async function check() {
  const startDate = new Date(2026, 3, 1); // April 1
  const endDate = new Date(2026, 4, 0); // April 30

  const purchases = await AdsPurchase.findAll({
    where: {
      [Op.or]: [
        { startDate: { [Op.between]: [startDate, endDate] } },
        { endDate: { [Op.between]: [startDate, endDate] } }
      ]
    }
  });

  console.log("Purchases in April 2026:", JSON.stringify(purchases, null, 2));
}

check().catch(console.error);
