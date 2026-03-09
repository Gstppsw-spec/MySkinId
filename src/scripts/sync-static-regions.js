const axios = require("axios");
const {
    masterProvince,
    masterCity,
    masterDistrict,
    masterSubDistrict,
    sequelize
} = require("../models");
const { v4: uuidv4 } = require('uuid');

const DATA_URL = "https://raw.githubusercontent.com/pentagonal/Indonesia-Postal-Code/master/Json/postal_province_code_as_key.json";

// Province Code to Name Map (Standard BPS/ISO)
const PROVINCE_NAMES = {
    "11": "ACEH",
    "12": "SUMATERA UTARA",
    "13": "SUMATERA BARAT",
    "14": "RIAU",
    "15": "JAMBI",
    "16": "SUMATERA SELATAN",
    "17": "BENGKULU",
    "18": "LAMPUNG",
    "19": "KEPULAUAN BANGKA BELITUNG",
    "21": "KEPULAUAN RIAU",
    "31": "DKI JAKARTA",
    "32": "JAWA BARAT",
    "33": "JAWA TENGAH",
    "34": "DAERAH ISTIMEWA YOGYAKARTA",
    "35": "JAWA TIMUR",
    "36": "BANTEN",
    "51": "BALI",
    "52": "NUSA TENGGARA BARAT",
    "53": "NUSA TENGGARA TIMUR",
    "61": "KALIMANTAN BARAT",
    "62": "KALIMANTAN TENGAH",
    "63": "KALIMANTAN SELATAN",
    "64": "KALIMANTAN TIMUR",
    "65": "KALIMANTAN UTARA",
    "71": "SULAWESI UTARA",
    "72": "SULAWESI TENGAH",
    "73": "SULAWESI SELATAN",
    "74": "SULAWESI TENGGARA",
    "75": "GORONTALO",
    "76": "SULAWESI BARAT",
    "81": "MALUKU",
    "82": "MALUKU UTARA",
    "91": "PAPUA BARAT",
    "94": "PAPUA"
};

async function syncStaticRegions() {
    try {
        console.log("--- STARTING STATIC DATA SYNC (LIMIT-FREE) ---");
        console.log("Downloading dataset from GitHub...");

        const response = await axios.get(DATA_URL);
        const data = response.data;

        if (!data || typeof data !== 'object') {
            throw new Error("Invalid data format received from source.");
        }

        const transaction = await sequelize.transaction();
        try {
            console.log("Resetting existing administrative tables...");
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
            throw err;
        }

        console.log("Processing and Inserting Data (~83,000 records)...");

        const provinceMap = new Map(); // Code -> UUID
        const cityMap = new Map();     // ProvinceCode|CityName -> UUID
        const districtMap = new Map(); // CityUUID|DistrictName -> UUID

        let totalInserted = 0;
        const allProvinceCodes = Object.keys(data);

        for (const code of allProvinceCodes) {
            const items = data[code];
            const pName = PROVINCE_NAMES[code] || `PROVINSI ${code}`;

            // 1. Create Province
            let pId = uuidv4();
            await masterProvince.create({ id: pId, name: pName });
            provinceMap.set(code, pId);
            console.log(`\n[PROVINCE] ${pName}`);

            for (const item of items) {
                // Data Structure: { urban: 'VILLAGE', sub_district: 'KECAMATAN', city: 'KOTA', postal_code: '123' }
                const cName = item.city.toUpperCase();
                const dName = item.sub_district.toUpperCase();
                const sdName = item.urban.toUpperCase();
                const zip = String(item.postal_code);

                // 2. City
                const cityKey = `${code}|${cName}`;
                let cId = cityMap.get(cityKey);
                if (!cId) {
                    cId = uuidv4();
                    await masterCity.create({ id: cId, provinceId: pId, name: cName });
                    cityMap.set(cityKey, cId);
                    console.log(`  [CITY] ${cName}`);
                }

                // 3. District (Kecamatan)
                const districtKey = `${cId}|${dName}`;
                let dId = districtMap.get(districtKey);
                if (!dId) {
                    dId = uuidv4();
                    await masterDistrict.create({ id: dId, cityId: cId, name: dName });
                    districtMap.set(districtKey, dId);
                    process.stdout.write(".");
                }

                // 4. SubDistrict (Kelurahan/Desa)
                await masterSubDistrict.create({
                    id: uuidv4(),
                    districtId: dId,
                    name: sdName,
                    zipCode: zip
                });

                totalInserted++;
            }
        }

        console.log("\n--- SYNC COMPLETED SUCCESSFULLY ---");
        console.log(`Total Records Imported: ${totalInserted}`);
        process.exit(0);

    } catch (error) {
        console.error("\nSync Fatal Error:", error.message);
        process.exit(1);
    }
}

syncStaticRegions();
