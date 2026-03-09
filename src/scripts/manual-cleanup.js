const {
    masterProvince,
    masterCity,
    sequelize
} = require('../models');

async function manualCleanup() {
    const transaction = await sequelize.transaction();
    try {
        console.log("--- Starting Manual Duplicates Cleanup ---");

        // 1. Merge NTB
        const ntbOld = await masterProvince.findOne({ where: { name: 'NUSA TENGGARA BARAT (NTB)' }, transaction });
        const ntbNew = await masterProvince.findOne({ where: { name: 'NUSA TENGGARA BARAT' }, transaction });
        if (ntbOld && ntbNew) {
            console.log("Merging NTB...");
            await masterCity.update({ provinceId: ntbNew.id }, { where: { provinceId: ntbOld.id }, transaction });
            await masterProvince.destroy({ where: { id: ntbOld.id }, transaction });
        }

        // 2. Delete null province
        const nullProv = await masterProvince.findOne({ where: { name: null }, transaction });
        if (nullProv) {
            console.log("Deleting null province...");
            // Check if it has cities
            await masterCity.destroy({ where: { provinceId: nullProv.id }, transaction });
            await masterProvince.destroy({ where: { id: nullProv.id }, transaction });
        }

        await transaction.commit();
        console.log("\n--- Manual Cleanup Completed Successfully ---");
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("\n--- Manual Cleanup Failed ---");
        console.error(error);
    }
}

manualCleanup();
