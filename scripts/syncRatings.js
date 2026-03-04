const { masterProduct, masterPackage, masterService, masterLocation, Rating, sequelize } = require("../src/models");

async function syncRatings() {
    const entities = [
        { model: masterProduct, type: "PRODUCT", name: "Product" },
        { model: masterPackage, type: "PACKAGE", name: "Package" },
        { model: masterService, type: "SERVICE", name: "Service" },
        { model: masterLocation, type: "LOCATION", name: "Location" }
    ];

    console.log("Starting rating synchronization...");
    const t = await sequelize.transaction();

    try {
        for (const entity of entities) {
            console.log(`\nSyncing ${entity.name} ratings...`);

            const records = await entity.model.findAll({ transaction: t });

            for (const record of records) {
                const ratings = await Rating.findAll({
                    where: {
                        entityType: entity.type,
                        entityId: record.id
                    },
                    transaction: t
                });

                const actualCount = ratings.length;
                const actualSum = ratings.reduce((acc, r) => acc + r.rating, 0);
                const actualAvg = actualCount > 0 ? Number((actualSum / actualCount).toFixed(2)) : 0;

                if (record.ratingAvg !== actualAvg || record.ratingCount !== actualCount) {
                    console.log(`Updating ${entity.name}: ${record.name || record.id}`);
                    console.log(`  Old: avg=${record.ratingAvg}, count=${record.ratingCount}`);
                    console.log(`  New: avg=${actualAvg}, count=${actualCount}`);

                    await record.update({
                        ratingAvg: actualAvg,
                        ratingCount: actualCount
                    }, { transaction: t });
                }
            }
        }

        await t.commit();
        console.log("\nSuccessfully synchronized all ratings.");
        process.exit(0);
    } catch (error) {
        await t.rollback();
        console.error("Error synchronizing ratings:", error);
        process.exit(1);
    }
}

syncRatings();
