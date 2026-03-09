const {
    masterProvince,
    masterCity,
    masterDistrict,
    masterSubDistrict,
    sequelize
} = require('../models');
const { v4: uuidv4 } = require('uuid');

async function fixUuids() {
    const transaction = await sequelize.transaction();
    try {
        console.log("--- Starting UUID conversion for administrative tables ---");

        const tables = [
            { model: masterProvince, name: 'masterProvince', parentField: null },
            { model: masterCity, name: 'masterCity', parentField: 'provinceId' },
            { model: masterDistrict, name: 'masterDistrict', parentField: 'cityId' },
            { model: masterSubDistrict, name: 'masterSubDistrict', parentField: 'districtId' }
        ];

        const idMap = {}; // oldId -> newUuid

        for (let i = 0; i < tables.length; i++) {
            const { model, name, parentField } = tables[i];
            console.log(`\nProcessing ${name}...`);

            const records = await model.findAll({ transaction, raw: true });
            console.log(`Found ${records.length} records.`);

            for (const rec of records) {
                // If ID is not a UUID (roughly checking length/format)
                if (rec.id.length < 36) {
                    const newUuid = uuidv4();
                    idMap[rec.id] = newUuid;

                    console.log(`  Converting ${rec.id} -> ${newUuid} (${rec.name})`);

                    // Update the record with new ID
                    await model.update({ id: newUuid }, { where: { id: rec.id }, transaction });
                }
            }

            // Update foreign keys in the NEXT table if applicable
            if (i < tables.length - 1) {
                const nextTable = tables[i + 1];
                console.log(`Updating foreign keys in ${nextTable.name}...`);

                for (const [oldId, newUuid] of Object.entries(idMap)) {
                    await nextTable.model.update(
                        { [nextTable.parentField]: newUuid },
                        { where: { [nextTable.parentField]: oldId }, transaction }
                    );
                }
            }
        }

        await transaction.commit();
        console.log("\n--- UUID conversion completed successfully ---");
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("\n--- UUID conversion failed ---");
        console.error(error);
    }
}

fixUuids();
