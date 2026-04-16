const cron = require("node-cron");
const NotificationService = require("../services/notification.service");

function initFlashSaleCron() {
  // Run daily at 08:00 AM
  cron.schedule("0 8 * * *", async () => {
    console.log("[Cron] Running daily Flash Sale notification job...");
    const result = await NotificationService.notifyFlashSaleDaily();
    console.log("[Cron] Flash Sale notification job result:", result.message);
  });
}

module.exports = initFlashSaleCron;
