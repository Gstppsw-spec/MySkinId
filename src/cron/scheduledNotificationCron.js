const cron = require("node-cron");
const { Op } = require("sequelize");
const { scheduledNotification, flashSale } = require("../models");

/**
 * Sends a notification directly.
 */
async function sendNotificationDirectly(notif) {
  try {
    let customerIds = [];
    let referenceId = null;
    let referenceType = null;
    let type = "GENERAL_BROADCAST";
    let meta = { clickRoute: notif.clickRoute || "" };

    if (notif.flashSaleId) {
      const fs = await flashSale.findByPk(notif.flashSaleId);
      if (!fs) {
        console.warn(`[ScheduledNotificationCron] Flash sale ${notif.flashSaleId} not found for notification ${notif.id}. Skipping.`);
        return;
      }
      referenceId = fs.id;
      referenceType = "flashSale";
      type = "FLASH_SALE_CUSTOMER";
      meta.status = fs.status;

      if (notif.target === "CART_REFERENCED") {
        const items = await require("../models").flashSaleItem.findAll({
          where: { flashSaleId: notif.flashSaleId },
          attributes: ["id"],
        });
        const flashSaleItemIds = items.map(i => i.id);

        if (flashSaleItemIds.length > 0) {
          const carts = await require("../models").customerCart.findAll({
            where: { flashSaleItemId: { [Op.in]: flashSaleItemIds } },
            attributes: ["customerId"],
          });
          customerIds = Array.from(new Set(carts.map(c => c.customerId).filter(Boolean)));
        }
      } else {
        const customers = await require("../models").masterCustomer.findAll({
          where: { isActive: true },
          attributes: ["id"],
        });
        customerIds = customers.map(c => c.id).filter(Boolean);
      }
    } else {
      // General notification broadcast targeting all active customers
      const customers = await require("../models").masterCustomer.findAll({
        where: { isActive: true },
        attributes: ["id"],
      });
      customerIds = customers.map(c => c.id).filter(Boolean);
    }

    if (customerIds.length === 0) {
      console.log(`[ScheduledNotificationCron] No customers found to notify for notification ${notif.id}.`);
      return;
    }

    const NotificationService = require("../services/notification.service");
    const sendPromises = customerIds.map(customerId =>
      NotificationService.createNotification({
        userId: customerId,
        recipientType: "customer",
        title: notif.title,
        body: notif.body,
        category: "Promotion",
        type,
        referenceId,
        referenceType,
        meta,
      })
    );

    await Promise.all(sendPromises);
    console.log(`[ScheduledNotificationCron] Successfully sent scheduled notification ${notif.id} to ${customerIds.length} customers.`);
  } catch (err) {
    console.error(`[ScheduledNotificationCron] Error sending notification ${notif.id}:`, err.message);
    throw err;
  }
}

/**
 * Initialize the scheduled notification cron.
 * Runs every minute to evaluate:
 * 1. One-off scheduled notifications (status: 'PENDING', repeatDaily: false, scheduledAt <= now)
 * 2. Repeating daily notifications (status: 'ACTIVE', repeatDaily: true, scheduledAt <= now)
 */
function initScheduledNotificationCron() {
  console.log("[Cron] Initializing Scheduled Notification Cron...");

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // ─── 1. Process One-Off Scheduled Notifications ───
      const pendingOneOffs = await scheduledNotification.findAll({
        where: {
          status: "PENDING",
          repeatDaily: false,
          scheduledAt: { [Op.lte]: now },
        },
      });

      for (const notif of pendingOneOffs) {
        console.log(`[ScheduledNotificationCron] Processing pending one-off notification ${notif.id}...`);
        try {
          await sendNotificationDirectly(notif);
          await notif.update({ status: "SENT", lastSentAt: new Date() });
        } catch (error) {
          console.error(`[ScheduledNotificationCron] One-off notification ${notif.id} failed:`, error.message);
          await notif.update({ status: "FAILED" });
        }
      }

      // ─── 2. Process Repeating Daily Notifications ───
      const activeRepeating = await scheduledNotification.findAll({
        where: {
          status: "ACTIVE",
          repeatDaily: true,
          scheduledAt: { [Op.lte]: now },
        },
      });

      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      for (const notif of activeRepeating) {
        // Check if it was already sent today (UTC or local based on the server runtime)
        const alreadySentToday = notif.lastSentAt && new Date(notif.lastSentAt) >= startOfToday;

        if (!alreadySentToday) {
          const schedTime = new Date(notif.scheduledAt);
          
          // Get target hours and minutes from the original scheduled date/time
          const targetHours = schedTime.getHours();
          const targetMinutes = schedTime.getMinutes();

          // Create a comparison Date for today at the scheduled hour and minute
          const schedTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHours, targetMinutes, 0, 0);

          if (now >= schedTimeToday) {
            console.log(`[ScheduledNotificationCron] Processing daily repeating notification ${notif.id}...`);
            try {
              await sendNotificationDirectly(notif);
              await notif.update({ lastSentAt: new Date() });
            } catch (error) {
              console.error(`[ScheduledNotificationCron] Daily repeating notification ${notif.id} failed:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error("[ScheduledNotificationCron] Error in cron tick:", error.message);
    }
  });
}

module.exports = {
  initScheduledNotificationCron,
  sendNotificationDirectly
};
