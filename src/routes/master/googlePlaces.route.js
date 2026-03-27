const express = require("express");
const router = express.Router();
const googlePlacesController = require("../../controllers/googlePlaces.controller");
const { verifyToken } = require("../../middlewares/authMiddleware");

// Public: Get Google rating for a location
router.get("/:locationId/rating", googlePlacesController.getGoogleRating);

// Public: Get Google reviews for a location
router.get("/:locationId/reviews", googlePlacesController.getGoogleReviews);

// Protected: Update Google Place ID for a location
router.put(
  "/:locationId/place-id",
  verifyToken,
  googlePlacesController.updatePlaceId
);

// Protected: Trigger sync for all locations
router.post("/sync", verifyToken, googlePlacesController.triggerSync);

// Protected: Batch auto-find and set Place IDs for all locations
router.post(
  "/batch-find-place",
  verifyToken,
  googlePlacesController.batchAutoFindPlaceIds
);

// Protected: Sync a single location
router.post(
  "/:locationId/sync",
  verifyToken,
  googlePlacesController.syncSingleLocation
);

// Protected: Search Google Place ID candidates for a location
router.get(
  "/:locationId/find-place",
  verifyToken,
  googlePlacesController.findPlaceId
);

module.exports = router;
