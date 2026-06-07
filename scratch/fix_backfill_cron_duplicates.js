const { CompanyAdsBalance, CompanyAdsBalanceHistory, platformTransfer, sequelize } = require("../src/models");
const { Op } = require("sequelize");

async function fixBackfillCronDuplicates() {
  const t = await sequelize.transaction();
  try {
    await sequelize.authenticate();
    console.log("Database connected.\n");

    // 1. Fetch all platform transfers that are SUCCESS
    const transfers = await platformTransfer.findAll({
      where: { status: "SUCCESS" },
      transaction: t
    });

    console.log(`Analyzing ${transfers.length} successful platform transfers for Backfill-Cron conflicts...`);

    let fixCount = 0;
    for (const transfer of transfers) {
      if (!transfer.transactionItemId) continue;

      // Find cron settlement history record (contains transfer.reference in description)
      const cronHistory = await CompanyAdsBalanceHistory.findOne({
        where: {
          description: { [Op.like]: `%${transfer.reference}%` }
        },
        transaction: t
      });

      // Find backfill settlement history record (referenceId is transactionItemId)
      const backfillHistory = await CompanyAdsBalanceHistory.findOne({
        where: {
          referenceId: transfer.transactionItemId,
          type: { [Op.in]: ["VOUCHER_SETTLEMENT", "PRODUCT_SETTLEMENT"] }
        },
        transaction: t
      });

      // If BOTH exist, we have a duplicate!
      if (cronHistory && backfillHistory) {
        console.log(`\n⚠️  CONFLICT DETECTED for Transfer Ref: ${transfer.reference}`);
        console.log(`   Transaction Item ID: ${transfer.transactionItemId}`);
        
        // Get company balance
        const balance = await CompanyAdsBalance.findOne({
          where: { id: cronHistory.balanceId },
          lock: true,
          transaction: t,
          include: [{ model: sequelize.models.masterCompany, as: "company" }]
        });

        if (!balance) {
          console.warn(`   Balance record ${cronHistory.balanceId} not found. Skipping.`);
          continue;
        }

        const companyName = balance.company?.name || "Unknown Company";
        const duplicateAmount = parseFloat(backfillHistory.amount);

        console.log(`   Company: ${companyName}`);
        console.log(`   Cron History ID: ${cronHistory.id} (Rp ${parseFloat(cronHistory.amount).toLocaleString("id-ID")})`);
        console.log(`   Backfill History ID: ${backfillHistory.id} (Rp ${duplicateAmount.toLocaleString("id-ID")})`);
        console.log(`   Current Balance: Rp ${parseFloat(balance.balance).toLocaleString("id-ID")}`);
        console.log(`   Deducting duplicate amount: Rp ${duplicateAmount.toLocaleString("id-ID")}`);

        // Deduct duplicate from balance
        const newBalance = parseFloat(balance.balance) - duplicateAmount;
        await balance.update({ balance: newBalance }, { transaction: t });

        // Delete the backfill history record (or cron history) to clean up ledger
        await backfillHistory.destroy({ transaction: t });
        console.log(`   Deleted duplicate Backfill History record.`);
        console.log(`   New Balance for ${companyName}: Rp ${newBalance.toLocaleString("id-ID")}`);

        fixCount++;
      }
    }

    if (fixCount === 0) {
      console.log("\nNo Backfill-Cron conflicts/duplicates found.");
    } else {
      console.log(`\n✅ Successfully corrected ${fixCount} duplicate balance entries!`);
    }

    await t.commit();
    console.log("\n✅ Database recovery completed successfully!");
  } catch (error) {
    await t.rollback();
    console.error("\n❌ Error during duplicate recovery:", error);
  } finally {
    process.exit(0);
  }
}

fixBackfillCronDuplicates();
