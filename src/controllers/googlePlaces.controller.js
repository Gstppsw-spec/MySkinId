const googlePlacesService = require("../services/googlePlaces.service");
const { getPagination, formatPagination } = require("../utils/pagination");

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
      const { page, pageSize } = req.query;
      const { limit, offset } = getPagination(page, pageSize);

      const result = await googlePlacesService.getGoogleReviews(
        locationId,
        limit,
        offset
      );

      if (!result.status) {
        return res.status(404).json(result);
      }

      return res.status(200).json({
        status: true,
        message: result.message,
        data: result.data.reviews,
        pagination: formatPagination(result.data.totalCount, page, pageSize),
      });
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
   * Update Google Place ID for a location.
   * Accepts either: { googlePlaceId: "ChIJ..." } or { googleMapsUrl: "https://maps..." }
   */
  async updatePlaceId(req, res) {
    try {
      const { locationId } = req.params;
      let { googlePlaceId, googleMapsUrl } = req.body;

      // If user provides a Google Maps URL, extract the place_id from it
      if (!googlePlaceId && googleMapsUrl) {
        const extractResult =
          await googlePlacesService.extractPlaceIdFromUrl(googleMapsUrl);

        if (!extractResult.status) {
          return res.status(400).json({
            status: false,
            message: extractResult.message,
          });
        }

        googlePlaceId = extractResult.placeId;
      }

      if (!googlePlaceId) {
        return res.status(400).json({
          status: false,
          message: "googlePlaceId atau googleMapsUrl harus diisi",
        });
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
