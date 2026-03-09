const { masterProvince, sequelize } = require('../models');

async function addMissingProvinces() {
    const transaction = await sequelize.transaction();
    try {
        console.log("--- Adding missing provinces ---");

        const missingProvinces = [
            "KALIMANTAN BARAT",
            "PAPUA SELATAN",
            "PAPUA TENGAH",
            "PAPUA PEGUNUNGAN",
            "PAPUA BARAT DAYA"
        ];

        for (const name of missingProvinces) {
            const [record, created] = await masterProvince.findOrCreate({
                where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), name.toLowerCase()),
                defaults: { name },
                transaction
            });

            if (created) {
                console.log(`  Added: ${name}`);
            } else {
                console.log(`  Already exists: ${name}`);
            }
        }

        await transaction.commit();
        console.log("\n--- Provinces completed ---");
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("\n--- Failed to add provinces ---");
        console.error(error);
    }
}

addMissingProvinces();
