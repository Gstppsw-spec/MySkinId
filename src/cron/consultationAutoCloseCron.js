const cron = require("node-cron");
const { Op } = require("sequelize");
const { masterRoomConsultation } = require("../models");
const socketInstance = require("../socket/socketInstance");

/**
 * Auto-close consultation rooms that have been open/pending for more than 7 days.
 * 
 * Logic:
 * - Finds all rooms where status is NOT "closed"
 * - AND either:
 *   1. expiredAt is set and has passed (expiredAt <= now), OR
 *   2. expiredAt is null but createdAt is older than 7 days
 * 
 * Runs every day at 02:00 AM server time.
 */
function initConsultationAutoCloseCron() {
  cron.schedule("0 2 * * *", async () => {
    console.log("[ConsultationAutoClose] Running auto-close job...");

    try {
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Find rooms that should be auto-closed
      const expiredRooms = await masterRoomConsultation.findAll({
        where: {
          status: { [Op.notIn]: ["closed"] },
          [Op.or]: [
            // Room has expiredAt set and it has passed
            {
              expiredAt: { [Op.ne]: null, [Op.lte]: now },
            },
            // Room has no expiredAt but was created more than 7 days ago
            {
              expiredAt: null,
              createdAt: { [Op.lte]: sevenDaysAgo },
            },
          ],
        },
      });

      console.log(
        `[ConsultationAutoClose] Found ${expiredRooms.length} expired room(s) to close.`
      );

      let closedCount = 0;
      let errorCount = 0;

      for (const room of expiredRooms) {
        try {
          room.status = "closed";
          await room.save();

          // Emit socket event so connected clients get notified in real-time
          socketInstance.emitRoomStatusUpdate(room.id, "closed");

          closedCount++;
          console.log(
            `[ConsultationAutoClose] Closed room ${room.roomCode} (ID: ${room.id}, created: ${room.createdAt})`
          );
        } catch (error) {
          errorCount++;
          console.error(
            `[ConsultationAutoClose] Error closing room ${room.id}:`,
            error.message
          );
        }
      }

      console.log(
        `[ConsultationAutoClose] Job completed. Closed: ${closedCount}, Errors: ${errorCount}`
      );
    } catch (error) {
      console.error(
        "[ConsultationAutoClose] Cron job failed:",
        error.message
      );
    }
  });

  console.log("[ConsultationAutoClose] Cron job scheduled (daily at 02:00 AM).");
}

module.exports = initConsultationAutoCloseCron;
