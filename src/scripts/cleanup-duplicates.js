const {
    masterProvince,
    masterCity,
    masterDistrict,
    masterSubDistrict,
    sequelize
} = require('../models');

async function cleanup() {
    const transaction = await sequelize.transaction();
    try {
        console.log("--- Starting Duplicates Cleanup ---");

        async function mergeTable(Model, groupFields, childModel = null, childForeignKey = null) {
            console.log(`\nMerging duplicates for ${Model.name}...`);

            const allRecords = await Model.findAll({ transaction });
            const groups = {};

            for (const rec of allRecords) {
                const key = groupFields.map(f => (rec[f] || '').toString().trim().toUpperCase()).join('|');
                if (!groups[key]) groups[key] = [];
                groups[key].push(rec);
            }

            for (const key in groups) {
                const records = groups[key];
                if (records.length > 1) {
                    console.log(`  Found ${records.length} duplicates for "${key}"`);

                    let survivor;
                    if (childModel) {
                        const counts = await Promise.all(records.map(r => childModel.count({ where: { [childForeignKey]: r.id }, transaction })));
                        const maxIdx = counts.indexOf(Math.max(...counts));
                        survivor = records[maxIdx];
                    } else {
                        survivor = records[0];
                    }

                    const losers = records.filter(r => r.id !== survivor.id);
                    const loserIds = losers.map(l => l.id);

                    console.log(`    Winner: ${survivor.id} ("${survivor.name}"), Losers: ${loserIds.length} records`);

                    if (childModel) {
                        await childModel.update({ [childForeignKey]: survivor.id }, { where: { [childForeignKey]: loserIds }, transaction });
                    }

                    await Model.destroy({ where: { id: loserIds }, transaction });
                }
            }
        }

        // Top-down cleanup
        await mergeTable(masterProvince, ['name'], masterCity, 'provinceId');
        await mergeTable(masterCity, ['name', 'provinceId'], masterDistrict, 'cityId');
        await mergeTable(masterDistrict, ['name', 'cityId'], masterSubDistrict, 'districtId');
        await mergeTable(masterSubDistrict, ['name', 'districtId']);

        await transaction.commit();
        console.log("\n--- Cleanup Completed Successfully ---");
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("\n--- Cleanup Failed ---");
        console.error(error);
    }
}

cleanup();
