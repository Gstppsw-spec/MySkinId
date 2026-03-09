const {
    masterProvince,
    masterCity,
    masterDistrict,
    masterSubDistrict,
    sequelize
} = require("../models");
const {
    fetchProvinces,
    fetchCities,
    fetchDistricts,
    fetchSubDistricts
} = require("../services/rajaongkir.service");
const { v4: uuidv4 } = require('uuid');

async function syncRajaOngkir() {
    // Check for --reset flag
    const shouldReset = process.argv.includes('--reset');

    if (shouldReset) {
        console.log("--- Resetting Administrative Tables (requested by --reset) ---");
        const transaction = await sequelize.transaction();
        try {
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
            await masterSubDistrict.destroy({ where: {}, truncate: true, transaction });
            await masterDistrict.destroy({ where: {}, truncate: true, transaction });
            await masterCity.destroy({ where: {}, truncate: true, transaction });
            await masterProvince.destroy({ where: {}, truncate: true, transaction });
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
            await transaction.commit();
            console.log("Tables truncated successfully.");
        } catch (err) {
            await transaction.rollback();
            console.error("Reset Error:", err.message);
            process.exit(1);
        }
    } else {
        console.log("--- Starting Resumable Raja Ongkir Sync (Idempotent) ---");
    }

    try {
        const provinces = await fetchProvinces();
        console.log(`Biteship/RajaOngkir found ${provinces.length} provinces.`);

        for (const p of provinces) {
            // Find or create province
            let [provinceRecord, createdP] = await masterProvince.findOrCreate({
                where: { name: p.name },
                defaults: { id: uuidv4() }
            });

            if (createdP) console.log(`[+] Province: ${p.name}`);
            else console.log(`[*] Province existing: ${p.name}`);

            try {
                const cities = await fetchCities(p.id);
                for (const c of cities) {
                    // Find or create city
                    let [cityRecord, createdC] = await masterCity.findOrCreate({
                        where: { name: c.name, provinceId: provinceRecord.id },
                        defaults: { id: uuidv4() }
                    });

                    if (createdC) console.log(`  [+] City: ${c.name}`);

                    try {
                        const districts = await fetchDistricts(c.id);
                        for (const d of districts) {
                            // Find or create district
                            let [districtRecord, createdD] = await masterDistrict.findOrCreate({
                                where: { name: d.name, cityId: cityRecord.id },
                                defaults: { id: uuidv4() }
                            });

                            if (createdD) {
                                process.stdout.write(`    [+] District: ${d.name}... `);

                                // SYNC SUB-DISTRICTS (KELURAHAN) - Only if district was just created or we want to ensure subdistricts exist
                                try {
                                    const subDistricts = await fetchSubDistricts(d.id);
                                    if (subDistricts && subDistricts.length > 0) {
                                        for (const sd of subDistricts) {
                                            await masterSubDistrict.findOrCreate({
                                                where: { name: sd.name, districtId: districtRecord.id },
                                                defaults: {
                                                    id: uuidv4(),
                                                    zipCode: String(sd.zip_code)
                                                }
                                            });
                                        }
                                        console.log(`Done (${subDistricts.length} villages)`);
                                    } else {
                                        console.log(`Done (0 villages)`);
                                    }
                                } catch (sdError) {
                                    console.log(`Error: ${sdError.message}`);
                                    if (sdError.message.includes('Daily limit exceeded')) {
                                        throw sdError; // Re-throw to catch block
                                    }
                                }
                            }
                        }
                    } catch (dError) {
                        console.error(`    Error fetching districts for ${c.name}:`, dError.message);
                        if (dError.message.includes('Daily limit exceeded')) {
                            throw dError;
                        }
                    }
                }
            } catch (cError) {
                console.error(`  Error fetching cities for ${p.name}:`, cError.message);
                if (cError.message.includes('Daily limit exceeded')) {
                    throw cError;
                }
            }
        }

        console.log("--- Sync Completed Successfully ---");
        process.exit(0);
    } catch (error) {
        if (error.message.includes('Daily limit exceeded')) {
            console.error("\n[!] RAJA ONGKIR LIMIT REACHED: Script dihentikan sementara.");
            console.log("Semua data yang sudah diproses telah tersimpan di Database.");
            console.log("Kamu bisa menjalankan kembali script ini besok setelah limit reset.");
            process.exit(0); // Exit gracefully as this is an expected limit
        }
        console.error("\nSync Fatal Error:", error.message);
        process.exit(1);
    }
}

syncRajaOngkir();
