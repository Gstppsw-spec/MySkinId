const axios = require("axios");
const { masterLocation, GoogleReview } = require("../models");
const { Op } = require("sequelize");

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_API_BASE = "https://places.googleapis.com/v1/places";

class GooglePlacesService {
  /**
   * Extract Google Place ID from a Google Maps URL.
   * Supports:
   * - Full URL: https://www.google.com/maps/place/...
   * - Short URL: https://maps.app.goo.gl/... or https://goo.gl/maps/...
   */
  async extractPlaceIdFromUrl(url) {
    try {
      let resolvedUrl = url;

      // If shortened URL, follow redirects to get the full URL
      if (
        url.includes("goo.gl/maps") ||
        url.includes("maps.app.goo.gl")
      ) {
        try {
          const response = await axios.get(url, {
            maxRedirects: 5,
            validateStatus: () => true,
            headers: {
              "User-Agent": "Mozilla/5.0",
            },
          });
          // axios follows redirects by default, get final URL from response
          resolvedUrl = response.request?.res?.responseUrl || response.request?._redirectable?._currentUrl || url;
        } catch (redirectErr) {
          console.warn("[GooglePlaces] Failed to resolve shortened URL:", redirectErr.message);
        }
      }

      // Method 1: Extract place_id from URL data parameter (ftid format)
      // Pattern: !1s followed by a place_id (starts with 0x or ChIJ)
      const ftidMatch = resolvedUrl.match(/!1s(0x[a-fA-F0-9]+:0x[a-fA-F0-9]+)/);
      if (ftidMatch) {
        // This is a CID-style ID, need to convert via Places API
        // Use the coordinates from URL to search instead
      }

      // Method 2: Extract place_id that starts with ChIJ
      const chijMatch = resolvedUrl.match(/(?:place_id[=:]|!1s)(ChIJ[a-zA-Z0-9_-]+)/);
      if (chijMatch) {
        return { status: true, placeId: chijMatch[1] };
      }

      // Method 3: Extract coordinates and place name from URL, search via API
      const coordMatch = resolvedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      const placeNameMatch = resolvedUrl.match(/\/place\/([^/@]+)/);

      if (placeNameMatch || coordMatch) {
        const searchQuery = placeNameMatch
          ? decodeURIComponent(placeNameMatch[1].replace(/\+/g, " "))
          : null;

        const requestBody = {};
        if (searchQuery) {
          requestBody.textQuery = searchQuery;
        }

        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lng = parseFloat(coordMatch[2]);
          requestBody.locationBias = {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: 500.0,
            },
          };
          // If no text query, search by a generic term with tight radius
          if (!requestBody.textQuery) {
            requestBody.textQuery = `place near ${lat},${lng}`;
          }
        }

        const response = await axios.post(
          "https://places.googleapis.com/v1/places:searchText",
          requestBody,
          {
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
              "X-Goog-FieldMask":
                "places.id,places.displayName,places.formattedAddress",
            },
          }
        );

        const places = response.data.places || [];
        if (places.length > 0) {
          return {
            status: true,
            placeId: places[0].id,
            name: places[0].displayName?.text,
            address: places[0].formattedAddress,
            totalCandidates: places.length,
          };
        }
      }

      return {
        status: false,
        message: "Tidak bisa mengekstrak Place ID dari URL ini. Pastikan URL valid dari Google Maps.",
      };
    } catch (error) {
      console.error("[GooglePlaces] Error extracting place ID from URL:", error.message);
      return { status: false, message: error.message };
    }
  }

  /**
   * Fetch place details (rating + reviews) from Google Places API (New)
   */
  async fetchPlaceDetails(placeId) {
    try {
      const response = await axios.get(`${PLACES_API_BASE}/${placeId}`, {
        headers: {
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "rating,userRatingCount,reviews",
        },
      });

      return {
        status: true,
        data: response.data,
      };
    } catch (error) {
      console.error(
        `[GooglePlaces] Error fetching place ${placeId}:`,
        error.response?.data || error.message
      );
      return {
        status: false,
        message: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Sync rating & reviews for a single location
   */
  async syncLocationRating(locationId) {
    try {
      const location = await masterLocation.findByPk(locationId);
      if (!location) {
        return { status: false, message: "Location not found" };
      }

      if (!location.googlePlaceId) {
        return {
          status: false,
          message: "Location does not have a Google Place ID",
        };
      }

      const result = await this.fetchPlaceDetails(location.googlePlaceId);
      if (!result.status) {
        return { status: false, message: result.message };
      }

      const { rating, userRatingCount, reviews } = result.data;

      // Update location with Google rating data
      await location.update({
        googleRating: rating || null,
        googleRatingCount: userRatingCount || 0,
        googleRatingSyncedAt: new Date(),
      });

      // Upsert reviews if available
      if (reviews && reviews.length > 0) {
        for (const review of reviews) {
          // Google Places API (New) uses review.name as unique identifier
          const googleReviewId =
            review.name || `${location.googlePlaceId}_${review.authorAttribution?.displayName}_${review.rating}`;

          const reviewData = {
            locationId: location.id,
            googleReviewId,
            authorName: review.authorAttribution?.displayName || "Anonymous",
            authorPhotoUrl: review.authorAttribution?.photoUri || null,
            rating: review.rating || 0,
            text:
              review.text?.text || review.originalText?.text || null,
            relativeTimeDescription: review.relativePublishTimeDescription || null,
            publishedAt: review.publishTime
              ? new Date(review.publishTime)
              : null,
          };

          // Upsert: update if exists (by googleReviewId), create if not
          const existing = await GoogleReview.findOne({
            where: { googleReviewId },
          });

          if (existing) {
            await existing.update(reviewData);
          } else {
            await GoogleReview.create(reviewData);
          }
        }
      }

      return {
        status: true,
        message: `Synced rating for ${location.name}`,
        data: {
          googleRating: rating,
          googleRatingCount: userRatingCount,
          reviewsSynced: reviews?.length || 0,
        },
      };
    } catch (error) {
      console.error(
        `[GooglePlaces] Error syncing location ${locationId}:`,
        error.message
      );
      return { status: false, message: error.message };
    }
  }

  /**
   * Sync all locations that have a googlePlaceId
   */
  async syncAllLocationRatings() {
    try {
      const locations = await masterLocation.findAll({
        where: {
          googlePlaceId: {
            [Op.ne]: null,
            [Op.ne]: "",
          },
          deletedAt: null,
        },
        attributes: ["id", "name", "googlePlaceId"],
      });

      console.log(
        `[GooglePlaces] Starting sync for ${locations.length} locations...`
      );

      const results = [];
      for (const location of locations) {
        const result = await this.syncLocationRating(location.id);
        results.push({
          locationId: location.id,
          name: location.name,
          ...result,
        });

        // Small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const successCount = results.filter((r) => r.status).length;
      const failCount = results.filter((r) => !r.status).length;

      console.log(
        `[GooglePlaces] Sync complete. Success: ${successCount}, Failed: ${failCount}`
      );

      return {
        status: true,
        message: `Sync complete. Success: ${successCount}, Failed: ${failCount}`,
        data: results,
      };
    } catch (error) {
      console.error("[GooglePlaces] Sync all error:", error.message);
      return { status: false, message: error.message };
    }
  }

  /**
   * Get Google rating for a location (from local DB)
   */
  async getGoogleRating(locationId) {
    try {
      const location = await masterLocation.findByPk(locationId, {
        attributes: [
          "id",
          "name",
          "googlePlaceId",
          "googleRating",
          "googleRatingCount",
          "googleRatingSyncedAt",
        ],
      });

      if (!location) {
        return { status: false, message: "Location not found" };
      }

      return {
        status: true,
        message: "Google rating fetched",
        data: {
          id: location.id,
          name: location.name,
          googlePlaceId: location.googlePlaceId,
          googleRating: location.googleRating,
          googleRatingCount: location.googleRatingCount,
          googleRatingSyncedAt: location.googleRatingSyncedAt,
        },
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  /**
   * Get Google reviews for a location (from local DB)
   */
  async getGoogleReviews(locationId, limit = 10, offset = 0) {
    try {
      const { count, rows } = await GoogleReview.findAndCountAll({
        where: { locationId },
        order: [["publishedAt", "DESC"]],
        limit,
        offset,
      });

      return {
        status: true,
        message: "Google reviews fetched",
        data: {
          reviews: rows,
          totalCount: count,
        },
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  /**
   * Update Google Place ID for a location, then immediately sync rating data
   */
  async updatePlaceId(locationId, googlePlaceId) {
    try {
      const location = await masterLocation.findByPk(locationId);
      if (!location) {
        return { status: false, message: "Location not found" };
      }

      await location.update({ googlePlaceId });

      // Immediately sync rating after setting place ID
      let syncData = null;
      try {
        const syncResult = await this.syncLocationRating(locationId);
        if (syncResult.status) {
          syncData = syncResult.data;
        }
      } catch (syncErr) {
        console.warn("[GooglePlaces] Auto-sync after place ID update failed:", syncErr.message);
      }

      return {
        status: true,
        message: "Google Place ID updated and rating synced successfully",
        data: {
          id: location.id,
          name: location.name,
          googlePlaceId,
          ...syncData,
        },
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  /**
   * Search for Google Place ID candidates by location name + coordinates
   * Returns all matches so the user can choose the correct one
   */
  async findPlaceId(locationId) {
    try {
      const location = await masterLocation.findByPk(locationId, {
        attributes: ["id", "name", "address", "latitude", "longitude"],
      });

      if (!location) {
        return { status: false, message: "Location not found" };
      }

      // Build search query from location name + address
      const searchQuery = [location.name, location.address]
        .filter(Boolean)
        .join(", ");

      if (!searchQuery) {
        return {
          status: false,
          message: "Location has no name or address to search with",
        };
      }

      // Use Google Places Text Search (New) API
      const requestBody = {
        textQuery: searchQuery,
      };

      // Add location bias if coordinates available
      if (location.latitude && location.longitude) {
        requestBody.locationBias = {
          circle: {
            center: {
              latitude: parseFloat(location.latitude),
              longitude: parseFloat(location.longitude),
            },
            radius: 5000.0, // 5km radius
          },
        };
      }

      const response = await axios.post(
        "https://places.googleapis.com/v1/places:searchText",
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location",
          },
        }
      );

      const places = response.data.places || [];

      if (places.length === 0) {
        return {
          status: true,
          message: "Tidak ditemukan tempat yang cocok di Google Maps",
          data: {
            searchQuery,
            candidates: [],
          },
        };
      }

      // Map results to a cleaner format
      const candidates = places.map((place, index) => ({
        index: index + 1,
        googlePlaceId: place.id,
        name: place.displayName?.text || "",
        address: place.formattedAddress || "",
        rating: place.rating || null,
        ratingCount: place.userRatingCount || 0,
        latitude: place.location?.latitude || null,
        longitude: place.location?.longitude || null,
      }));

      return {
        status: true,
        message: `Ditemukan ${candidates.length} kandidat. Pilih yang sesuai lalu gunakan PUT /:locationId/place-id untuk menyimpan.`,
        data: {
          searchQuery,
          locationName: location.name,
          candidates,
        },
      };
    } catch (error) {
      console.error(
        `[GooglePlaces] Error finding place for location ${locationId}:`,
        error.response?.data || error.message
      );
      return {
        status: false,
        message: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Batch auto-find and set Google Place IDs for all locations that don't have one.
   * - 1 candidate found → auto-set googlePlaceId
   * - 0 candidates → skip (not_found)
   * - >1 candidates → skip (needs_review), return candidates for manual selection
   */
  async batchAutoFindPlaceIds() {
    try {
      const locations = await masterLocation.findAll({
        where: {
          [Op.or]: [
            { googlePlaceId: null },
            { googlePlaceId: "" },
          ],
          deletedAt: null,
        },
        attributes: ["id", "name", "address", "latitude", "longitude"],
      });

      console.log(
        `[GooglePlaces] Batch find: ${locations.length} locations without Place ID`
      );

      const results = {
        autoSet: [],
        needsReview: [],
        notFound: [],
        errors: [],
      };

      for (const location of locations) {
        try {
          const searchResult = await this.findPlaceId(location.id);

          if (!searchResult.status) {
            results.errors.push({
              locationId: location.id,
              name: location.name,
              error: searchResult.message,
            });
            continue;
          }

          const candidates = searchResult.data?.candidates || [];

          if (candidates.length === 1) {
            // Exactly 1 match → auto-set
            await location.update({
              googlePlaceId: candidates[0].googlePlaceId,
            });
            results.autoSet.push({
              locationId: location.id,
              name: location.name,
              googlePlaceId: candidates[0].googlePlaceId,
              matchedName: candidates[0].name,
              matchedAddress: candidates[0].address,
            });
          } else if (candidates.length > 1) {
            // Multiple matches → needs manual review
            results.needsReview.push({
              locationId: location.id,
              name: location.name,
              candidates: candidates,
            });
          } else {
            // No matches
            results.notFound.push({
              locationId: location.id,
              name: location.name,
              searchQuery: searchResult.data?.searchQuery,
            });
          }

          // Delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (err) {
          results.errors.push({
            locationId: location.id,
            name: location.name,
            error: err.message,
          });
        }
      }

      const summary = `Auto-set: ${results.autoSet.length}, Perlu review: ${results.needsReview.length}, Tidak ditemukan: ${results.notFound.length}, Error: ${results.errors.length}`;
      console.log(`[GooglePlaces] Batch find complete. ${summary}`);

      return {
        status: true,
        message: summary,
        data: results,
      };
    } catch (error) {
      console.error("[GooglePlaces] Batch find error:", error.message);
      return { status: false, message: error.message };
    }
  }
  /**
   * General Google Places Search by name/query
   * Returns a list of candidates from Google Maps
   */
  async searchPlaces(query, lat, lng) {
    try {
      if (!query) {
        return { status: false, message: "Query pencarian harus diisi" };
      }

      // Use Google Places Text Search (New) API
      const requestBody = {
        textQuery: query,
      };

      // Add location bias if coordinates available
      if (lat && lng) {
        requestBody.locationBias = {
          circle: {
            center: {
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
            },
            radius: 5000.0, // 5km radius
          },
        };
      }

      const response = await axios.post(
        "https://places.googleapis.com/v1/places:searchText",
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location",
          },
        }
      );

      const places = response.data.places || [];

      // Map results to a clearer format
      const candidates = places.map((place, index) => ({
        googlePlaceId: place.id,
        name: place.displayName?.text || "",
        address: place.formattedAddress || "",
        rating: place.rating || null,
        ratingCount: place.userRatingCount || 0,
        latitude: place.location?.latitude || null,
        longitude: place.location?.longitude || null,
      }));

      return {
        status: true,
        message: `Ditemukan ${candidates.length} lokasi`,
        data: candidates,
      };
    } catch (error) {
      console.error(
        `[GooglePlaces] Error searching for "${query}":`,
        error.response?.data || error.message
      );
      return {
        status: false,
        message: error.response?.data?.error?.message || error.message,
      };
    }
  }
}

module.exports = new GooglePlacesService();
