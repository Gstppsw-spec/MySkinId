const { masterDistrict, masterSubDistrict } = require("../models");
const { searchArea } = require("../services/biteship.service");
const { sleep } = require("../helpers/request.helper");

/**
 * Script to enrich masterSubDistrict with zip codes using Biteship API
 * This script works by searching at the District level, which returns 
 * all sub-districts (villages) and their postal codes in one go.
 */
async function enrichZipCodes(cityId = null) {
    try {
        console.log("--- Starting Zip Code Enrichment ---");

        // Filter by city if provided, else get all districts
        const where = cityId ? { cityId } : {};
        const districts = await masterDistrict.findAll({ where });

        console.log(`Found ${districts.length} districts to process.`);

        for (let i = 0; i < districts.length; i++) {
            const district = districts[i];
            console.log(`[${i + 1}/${districts.length}] Processing District: ${district.name}...`);

            try {
                // Search Biteship using District name
                const areas = await searchArea(district.name);

                if (!areas || areas.length === 0) {
                    console.log(`  No areas found for ${district.name}`);
                    continue;
                }

                // Filter results to only those in the same district
                for (const area of areas) {
                    if (area.administrative_division_level_3_name.toLowerCase().includes(district.name.toLowerCase())) {
                        const villageName = area.administrative_division_level_4_name || area.name.split(',')[0].trim();
                        const postalCode = area.postal_code;

                        if (villageName && postalCode) {
                            // Update masterSubDistrict
                            const [updatedCount] = await masterSubDistrict.update(
                                { zipCode: String(postalCode) },
                                {
                                    where: {
                                        districtId: district.id,
                                        name: villageName,
                                        zipCode: null // Only update if still empty
                                    }
                                }
                            );

                            if (updatedCount > 0) {
                                console.log(`  Updated ${villageName} -> ${postalCode}`);
                            }
                        }
                    }
                }

                // Slight delay to be kind to the API
                await sleep(500);
            } catch (err) {
                console.error(`  Error processing ${district.name}:`, err.message);
            }
        }

        console.log("--- Enrichment Completed ---");
        process.exit(0);
    } catch (error) {
        console.error("Enrichment Fatal Error:", error);
        process.exit(1);
    }
}

// Check for command line arguments
const cityIdArg = process.argv[2];
enrichZipCodes(cityIdArg);
