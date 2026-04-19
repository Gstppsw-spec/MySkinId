const { masterLocation } = require("../src/models");
const xenditPlatformService = require("../src/services/xenditPlatform.service");
require("dotenv").config();

/**
 * Script to populate xenditAccountId for all masterLocation records
 * that currently have a null value.
 * 
 * Usage: 
 *   node scripts/populateXenditAccounts.js          (Normal Run)
 *   DRY_RUN=true node scripts/populateXenditAccounts.js (Dry Run - no API calls)
 */

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    const isDryRun = process.env.DRY_RUN === "true";
    const force = process.argv.includes("--force");
    console.log(`\n=== Xendit Account Population Script ===`);
    console.log(`Mode: ${isDryRun ? "DRY RUN (Simulated)" : "NORMAL (Live API calls)"}`);
    console.log(`Force Overwrite: ${force}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}\n`);

    try {
        // 1. Fetch locations
        const where = {};
        if (!force) {
            where.xenditAccountId = null;
        }

        const locations = await masterLocation.findAll({ where });

        console.log(`Found ${locations.length} locations to process.`);

        if (locations.length === 0) {
            console.log("Nothing to process. Exiting.");
            process.exit(0);
        }

        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;

        for (const location of locations) {
            console.log(`\nProcessing [${location.id}] ${location.name}...`);

            if (!location.email) {
                console.warn(`- SKIPPED: Missing email address.`);
                skipCount++;
                continue;
            }

            if (isDryRun) {
                console.log(`- DRY RUN: Would create sub-account for ${location.email}`);
                successCount++;
            } else {
                try {
                    const result = await xenditPlatformService.createSubAccount(location);
                    if (result.status) {
                        console.log(`- SUCCESS: Created account ${result.data.xenditAccountId}`);
                        successCount++;
                    } else {
                        console.error(`- FAILED: ${result.message}`);
                        failCount++;
                    }
                } catch (err) {
                    console.error(`- ERROR: ${err.message}`);
                    failCount++;
                }

                // Add a small delay to avoid rate limiting (500ms)
                await sleep(500);
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(`Total Found: ${locations.length}`);
        console.log(`Success   : ${successCount}`);
        console.log(`Skipped   : ${skipCount} (Missing email)`);
        console.log(`Failed    : ${failCount}`);
        console.log(`===============\n`);

        process.exit(0);
    } catch (error) {
        console.error("Critical Error running script:", error);
        process.exit(1);
    }
}

run();
