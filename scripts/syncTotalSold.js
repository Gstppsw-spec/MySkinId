const { transactionItem, transaction, masterProduct, masterPackage, sequelize } = require("../src/models");
const { Op } = require("sequelize");

async function syncTotalSold() {
    console.log("Starting totalSold synchronization...");
    const t = await sequelize.transaction();
    try {
        // Reset all totalSold to 0 first
        await masterProduct.update({ totalSold: 0 }, { where: {}, transaction: t });
        await masterPackage.update({ totalSold: 0 }, { where: {}, transaction: t });

        // Fetch all items from PAID or COMPLETED transactions
        const items = await transactionItem.findAll({
            include: [
                {
                    model: transaction,
                    as: "transaction",
                    where: {
                        orderStatus: {
                            [Op.in]: ["PAID", "COMPLETED", "SHIPPED", "DELIVERED"],
                        },
                    },
                },
            ],
            transaction: t,
        });

        console.log(`Found ${items.length} transaction items to process.`);

        for (const item of items) {
            if (item.itemType === "PRODUCT") {
                await masterProduct.increment(
                    { totalSold: item.quantity },
                    { where: { id: item.itemId }, transaction: t }
                );
            } else if (item.itemType === "PACKAGE") {
                await masterPackage.increment(
                    { totalSold: item.quantity },
                    { where: { id: item.itemId }, transaction: t }
                );
            }
        }

        await t.commit();
        console.log("Successfully synchronized totalSold counts.");
        process.exit(0);
    } catch (error) {
        await t.rollback();
        console.error("Error during synchronization:", error);
        process.exit(1);
    }
}

syncTotalSold();
