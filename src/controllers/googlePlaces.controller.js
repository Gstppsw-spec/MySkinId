const googlePlacesService = require("../services/googlePlaces.service");

class GooglePlacesController {
  /**
   * GET /api/v2/google-places/:locationId/rating
   * Get Google rating for a location (from local DB)
   */
  async getGoogleRating(req, res) {
    try {
      const { locationId } = req.params;
      const result = await googlePlacesService.getGoogleRating(locationId);

      return res.status(result.status ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }

  /**
   * GET /api/v2/google-places/:locationId/reviews
   * Get Google reviews for a location (from local DB)
   */
  async getGoogleReviews(req, res) {
    try {
      const { locationId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await googlePlacesService.getGoogleReviews(
        locationId,
        page,
        limit
      );

      return res.status(result.status ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }

  /**
   * POST /api/v2/google-places/sync
   * Manual trigger to sync all locations (admin only)
   */
  async triggerSync(req, res) {
    try {
      const result = await googlePlacesService.syncAllLocationRatings();

      return res.status(result.status ? 200 : 500).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }

  /**
   * PUT /api/v2/google-places/:locationId/place-id
   * Update Google Place ID for a location
   */
  async updatePlaceId(req, res) {
    try {
      const { locationId } = req.params;
      const { googlePlaceId } = req.body;

      if (!googlePlaceId) {
        return res
          .status(400)
          .json({ status: false, message: "googlePlaceId is required" });
      }

      const result = await googlePlacesService.updatePlaceId(
        locationId,
        googlePlaceId
      );

      return res.status(result.status ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }

  /**
   * POST /api/v2/google-places/:locationId/sync
   * Sync a single location's rating
   */
  async syncSingleLocation(req, res) {
    try {
      const { locationId } = req.params;
      const result = await googlePlacesService.syncLocationRating(locationId);

      return res.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }

  /**
   * GET /api/v2/google-places/:locationId/find-place
   * Search Google Place ID candidates for a location
   */
  async findPlaceId(req, res) {
    try {
      const { locationId } = req.params;
      const result = await googlePlacesService.findPlaceId(locationId);

      return res.status(result.status ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }

  /**
   * POST /api/v2/google-places/batch-find-place
   * Auto-find and set Google Place IDs for all locations without one
   */
  async batchAutoFindPlaceIds(req, res) {
    try {
      const result = await googlePlacesService.batchAutoFindPlaceIds();

      return res.status(result.status ? 200 : 500).json(result);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  }
}

module.exports = new GooglePlacesController();
