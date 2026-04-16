require("dotenv").config();
const { masterLocation } = require("../src/models");
const xenditPlatformService = require("../src/services/xenditPlatform.service");

async function backfillXenditAccounts() {
    try {
        console.log("--- Starting Xendit Sub-Account Backfill ---");

        // 1. Find all locations that do NOT have a xenditAccountId
        const locations = await masterLocation.findAll({
            where: {
                [require('sequelize').Op.or]: [
                    { xenditAccountId: null },
                    { xenditAccountId: "" }
                ]
            },
        });

        console.log(`Found ${locations.length} locations without Xendit Account ID.`);

        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        for (const loc of locations) {
            console.log(`\nProcessing Location: ${loc.name} (${loc.id})`);
            
            if (!loc.email) {
                console.warn(`>> Skipping: Location has no email.`);
                skippedCount++;
                continue;
            }

            const result = await xenditPlatformService.createSubAccount(loc);

            if (result.status) {
                console.log(`>> Success: Created account ${result.data.xenditAccountId}`);
                successCount++;
            } else {
                console.error(`>> Failed: ${result.message}`);
                failCount++;
            }

            // Optional: small delay to avoid hitting rate limits if there are many outlets
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log("\n--- Backfill Summary ---");
        console.log(`Total Processed: ${locations.length}`);
        console.log(`Success: ${successCount}`);
        console.log(`Failed: ${failCount}`);
        console.log(`Skipped (No Email): ${skippedCount}`);
        console.log("--------------------------");

        process.exit(0);
    } catch (error) {
        console.error("Backfill Script Error:", error);
        process.exit(1);
    }
}

backfillXenditAccounts();
