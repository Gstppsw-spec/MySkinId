const { getOutletStats } = require("../services/transactionOrder");
const { relationshipUserLocation, masterLocation } = require("../models");

async function testStats() {
    try {
        console.log("--- Testing Outlet Statistics ---");

        // Find a random admin with location
        const userLoc = await relationshipUserLocation.findOne({
            where: { isactive: true },
            include: [{ model: masterLocation, as: "location" }]
        });

        if (!userLoc) {
            console.log("No admin/location mapping found in database. Skipping automated test.");
            return;
        }

        console.log(`Testing with Admin ID: ${userLoc.userId} for Location: ${userLoc.location?.name}`);

        const result = await getOutletStats(userLoc.userId, { startDate: null, endDate: null });

        if (result.status) {
            console.log("Success! Data received:");
            console.log(JSON.stringify(result.data, null, 2));
        } else {
            console.log("Failed to fetch stats:", result.message);
        }

    } catch (error) {
        console.error("Test Error:", error.message);
    } finally {
        process.exit();
    }
}

testStats();
