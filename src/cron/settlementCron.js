const cron = require("node-cron");
const { Op } = require("sequelize");
const { platformTransfer } = require("../models");
const xenditPlatformService = require("../services/xenditPlatform.service");

function initSettlementCron() {
  // Run daily at 01:00 AM
  cron.schedule("0 1 * * *", async () => {
    console.log("[SettlementCron] Running daily settlement job...");
    
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const pendingTransfers = await platformTransfer.findAll({
        where: {
          status: "PENDING_SETTLEMENT",
          createdAt: { [Op.lte]: threeDaysAgo }
        }
      });

      console.log(`[SettlementCron] Found ${pendingTransfers.length} pending settlements to process.`);

      for (const transfer of pendingTransfers) {
        try {
          console.log(`[SettlementCron] Processing transfer ${transfer.id} (Ref: ${transfer.reference})...`);
          const result = await xenditPlatformService.executePendingTransfer(transfer.id);
          console.log(`[SettlementCron] Transfer result for ${transfer.id}:`, result.message);
        } catch (error) {
          console.error(`[SettlementCron] Error processing transfer ${transfer.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error("[SettlementCron] Cron job failed:", error.message);
    }
  });
}

module.exports = initSettlementCron;
