require('dotenv').config();
const masterLocationService = require('../services/masterLocation.service');
const { sequelize } = require('../models');

async function test() {
  try {
    console.log("--- Testing getNewArrivalOutlets WITHOUT coordinates ---");
    const resNoCoords = await masterLocationService.getNewArrivalOutlets(null, null, { limit: 5, offset: 0 });
    console.log("Status:", resNoCoords.status);
    console.log("Count:", resNoCoords.totalCount);
    if (resNoCoords.data && resNoCoords.data.length > 0) {
      console.log("First item name:", resNoCoords.data[0].name);
      console.log("First item distance:", resNoCoords.data[0].distance);
      console.log("First item createdAt:", resNoCoords.data[0].createdAt);
    } else {
      console.log("No data returned (possibly no outlets added in last 30 days)");
    }

    console.log("\n--- Testing getNewArrivalOutlets WITH coordinates (Jakarta) ---");
    // Jakarta approx: -6.2088, 106.8456
    const resCoords = await masterLocationService.getNewArrivalOutlets("-6.2088", "106.8456", { limit: 5, offset: 0 });
    console.log("Status:", resCoords.status);
    console.log("Count:", resCoords.totalCount);
    if (resCoords.data && resCoords.data.length > 0) {
      resCoords.data.forEach((loc, i) => {
        console.log(`${i+1}. ${loc.name} - Distance: ${loc.distance}m`);
      });
    } else {
      console.log("No data returned with coordinates");
    }

    // Since thirtyDaysAgo filter might be too strict for test data, I'll try one without the filter just for SQL check
    // But getNewArrivalOutlets is hardcoded with 30 days.

    await sequelize.close();
  } catch (error) {
    console.error("Test failed:", error);
    if (sequelize) await sequelize.close();
    process.exit(1);
  }
}

test();
