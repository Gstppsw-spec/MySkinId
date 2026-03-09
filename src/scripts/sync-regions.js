const axios = require('axios');
const {
    masterProvince,
    masterCity,
    masterDistrict,
    masterSubDistrict,
    sequelize
} = require('../models');
const { Op } = require('sequelize');
require('dotenv').config();

const BASE_URL = "https://www.emsifa.com/api-wilayah-indonesia/api";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sync() {
    try {
        console.log("--- Starting Optimized Administrative Regions Sync (No SQL Logging) ---");

        // 1. Fetch Provinces
        console.log("Fetching Provinces...");
        const provRes = await axios.get(`${BASE_URL}/provinces.json`);
        const provinces = provRes.data;
        console.log(`Found ${provinces.length} provinces.`);

        for (const p of provinces) {
            const transaction = await sequelize.transaction({ logging: false });
            try {
                console.log(`\n[PROVINCE] Processing: ${p.name} (${p.id})`);

                let provinceRecord = await masterProvince.findOne({
                    where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), p.name.toLowerCase()),
                    transaction,
                    logging: false
                });

                if (!provinceRecord) {
                    provinceRecord = await masterProvince.create({ name: p.name }, { transaction, logging: false });
                }

                // 2. Fetch Cities for this Province
                const cityRes = await axios.get(`${BASE_URL}/regencies/${p.id}.json`);
                const cities = cityRes.data;
                console.log(`  [CITY] Found ${cities.length} cities.`);

                for (const c of cities) {
                    let cityRecord = await masterCity.findOne({
                        where: {
                            [Op.and]: [
                                sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), c.name.toLowerCase()),
                                { provinceId: provinceRecord.id }
                            ]
                        },
                        transaction,
                        logging: false
                    });

                    if (!cityRecord) {
                        cityRecord = await masterCity.create({ name: c.name, provinceId: provinceRecord.id }, { transaction, logging: false });
                    }

                    // 3. Fetch Districts for this City
                    const distRes = await axios.get(`${BASE_URL}/districts/${c.id}.json`);
                    const districts = distRes.data;

                    for (const d of districts) {
                        let districtRecord = await masterDistrict.findOne({
                            where: {
                                [Op.and]: [
                                    sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), d.name.toLowerCase()),
                                    { cityId: cityRecord.id }
                                ]
                            },
                            transaction,
                            logging: false
                        });

                        if (!districtRecord) {
                            districtRecord = await masterDistrict.create({ name: d.name, cityId: cityRecord.id }, { transaction, logging: false });
                        }

                        // Check if sub-districts already exist for this district
                        const existingSubCount = await masterSubDistrict.count({
                            where: { districtId: districtRecord.id },
                            transaction,
                            logging: false
                        });

                        if (existingSubCount === 0) {
                            // 4. Fetch SubDistricts (Villages) for this District
                            const villageRes = await axios.get(`${BASE_URL}/villages/${d.id}.json`);
                            const villages = villageRes.data;

                            if (villages.length > 0) {
                                const villageData = villages.map(v => ({
                                    name: v.name,
                                    districtId: districtRecord.id
                                }));

                                await masterSubDistrict.bulkCreate(villageData, { transaction, logging: false });
                                console.log(`    [DISTRICT] ${d.name}: Added ${villages.length} sub-districts.`);
                            }
                        }
                    }
                }
                await transaction.commit();
                console.log(`  [SUCCESS] Province ${p.name} synced.`);
                // Small delay between provinces
                await sleep(200);
            } catch (err) {
                await transaction.rollback();
                console.error(`  [ERROR] Failed to sync province ${p.name}:`, err.message);
            }
        }

        console.log("\n--- Full Sync Completed ---");
    } catch (error) {
        console.error("\n--- Global Sync Error ---");
        console.error(error.message);
    }
}

sync();
