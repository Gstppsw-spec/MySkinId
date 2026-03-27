const cron = require("node-cron");
const googlePlacesService = require("../services/googlePlaces.service");

/**
 * Google Maps Rating Sync Cron Job
 * Runs 4 times a day: 00:00, 06:00, 12:00, 18:00
 */
function initGoogleRatingCron() {
  // Cron expression: At minute 0 past hour 0, 6, 12, and 18
  cron.schedule("0 0,6,12,18 * * *", async () => {
    console.log(
      `[GoogleRatingCron] Starting scheduled sync at ${new Date().toISOString()}`
    );

    try {
      const result = await googlePlacesService.syncAllLocationRatings();
      console.log(`[GoogleRatingCron] ${result.message}`);
    } catch (error) {
      console.error("[GoogleRatingCron] Error during scheduled sync:", error.message);
    }
  });

  console.log(
    "[GoogleRatingCron] Cron job initialized — runs at 00:00, 06:00, 12:00, 18:00"
  );
}

module.exports = initGoogleRatingCron;
