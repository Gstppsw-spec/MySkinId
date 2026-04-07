const axios = require("axios");
const {
  masterLocation,
  masterCompany,
  masterUser,
  masterLocationImage,
  relationshipUserLocation,
  relationshipUserCompany,
  LocationVerificationRequest,
  customerFavorites,
  masterProvince,
  masterCity,
  masterDistrict,
  masterSubDistrict,
  requestVerification,
} = require("../models");

const fs = require("fs");
const path = require("path");
const { Op, Sequelize } = require("sequelize");
const {
  searchArea,
  getAreaByDetails,
} = require("./biteship.service");
const { sleep, retryRequest } = require("../helpers/request.helper");

class MasterLocationService {
  async create(data, files, userId) {
    try {
      // Resolve companyId if missing (for COMPANY_ADMIN)
      if (!data.companyId && userId) {
        const userComp = await relationshipUserCompany.findOne({
          where: { userId },
          attributes: ["companyId"],
        });
        if (userComp) {
          data.companyId = userComp.companyId;
        }
      }

      // Final validation to prevent database crash
      if (!data.companyId) {
        return {
          status: false,
          message: "companyId is required",
          data: null,
        };
      }

      const lastLocation = await masterLocation.findOne({
        order: [["createdAt", "DESC"]],
        attributes: ["code"],
      });

      let newCode = "OUTLET_00001";

      if (lastLocation && lastLocation.code) {
        const match = lastLocation.code.match(/OUTLET_(\d+)/);
        if (match) {
          const lastNumber = parseInt(match[1], 10);
          const nextNumber = lastNumber + 1;
          newCode = `OUTLET_${nextNumber.toString().padStart(5, "0")}`;
        }
      }

      // 1. Resolve Biteship area ID logic
      let resolvedAreaId = data.biteshipAreaId || null;
      if (!resolvedAreaId) {
        // Try detailed names lookup first (Village, District, City)
        const subDist = data.subdistrict || data.subDistrict;
        let pCode = data.postalCode;

        // Try to find local zipCode if missing
        if (!pCode && subDist && data.districtId) {
          const localSubDist = await masterSubDistrict.findOne({
            where: { name: subDist, districtId: data.districtId }
          });
          if (localSubDist) pCode = localSubDist.zipCode;
        }

        if (subDist && data.district && data.city) {
          const areaMatch = await getAreaByDetails(subDist, data.district, data.city, pCode);
          if (areaMatch) {
            resolvedAreaId = areaMatch.id;
            data.postalCode = data.postalCode || areaMatch.postal_code;

            // Back-fill local database
            if (subDist && data.districtId && areaMatch.postal_code) {
              await masterSubDistrict.update(
                { zipCode: String(areaMatch.postal_code) },
                { where: { name: subDist, districtId: data.districtId, zipCode: null } }
              ).catch(() => null);
            }
          }
        }

        // Fallback to postal code search
        if (!resolvedAreaId && (pCode || data.postalCode)) {
          const fallbackPCode = pCode || data.postalCode;
          resolvedAreaId = await searchArea(fallbackPCode).then(areas => {
            const exactMatch = areas.find(a => String(a.postal_code) === String(fallbackPCode));
            return exactMatch ? exactMatch.id : (areas[0] ? areas[0].id : null);
          }).catch(() => null);
        }
      }

      const newLocation = await masterLocation.create({
        ...data,
        code: newCode,
        biteshipAreaId: resolvedAreaId,
        createdBy: userId,
        updatedBy: userId,
      });
      if (files && files.length > 0) {
        for (const file of files) {
          await masterLocationImage.create({
            locationId: newLocation.id,
            imageUrl: file.path,
          });
        }
      }

      // Auto-create Xendit sub-account (non-blocking)
      try {
        const xenditPlatformService = require("./xenditPlatform.service");
        const xenditResult = await xenditPlatformService.createSubAccount(newLocation);
        if (xenditResult.status) {
          newLocation.xenditAccountId = xenditResult.data.xenditAccountId;
        } else {
          console.warn(`[Location Create] Xendit sub-account creation skipped/failed: ${xenditResult.message}`);
        }
      } catch (xenditError) {
        console.warn("[Location Create] Xendit sub-account creation failed (non-blocking):", xenditError.message);
      }

      // Auto-lookup Google Place ID (non-blocking)
      try {
        const googlePlacesService = require("./googlePlaces.service");
        let placeId = null;

        // Priority 1: User provided a Google Maps URL
        if (data.googleMapsUrl) {
          const extractResult = await googlePlacesService.extractPlaceIdFromUrl(data.googleMapsUrl);
          if (extractResult.status) {
            placeId = extractResult.placeId;
          } else {
            console.warn(`[Location Create] Could not extract Place ID from URL: ${extractResult.message}`);
          }
        }

        // Priority 2: Auto-search by name + coordinates
        if (!placeId) {
          const findResult = await googlePlacesService.findPlaceId(newLocation.id);
          if (findResult.status && findResult.data?.candidates?.length === 1) {
            placeId = findResult.data.candidates[0].googlePlaceId;
          } else if (findResult.status && findResult.data?.candidates?.length > 1) {
            console.warn(`[Location Create] Multiple Google Places candidates found for "${newLocation.name}" — set manually via PUT /google-places/:id/place-id`);
          } else {
            console.warn(`[Location Create] Google Place ID not found for "${newLocation.name}"`);
          }
        }

        if (placeId) {
          await newLocation.update({ googlePlaceId: placeId });
          newLocation.googlePlaceId = placeId;
          console.log(`[Location Create] Google Place ID set: ${placeId}`);

          // Immediately sync rating
          try {
            const syncResult = await googlePlacesService.syncLocationRating(newLocation.id);
            if (syncResult.status) {
              newLocation.googleRating = syncResult.data.googleRating;
              newLocation.googleRatingCount = syncResult.data.googleRatingCount;
              console.log(`[Location Create] Google rating synced: ${syncResult.data.googleRating} (${syncResult.data.googleRatingCount} reviews)`);
            }
          } catch (syncErr) {
            console.warn("[Location Create] Google rating sync failed (non-blocking):", syncErr.message);
          }
        }
      } catch (googleError) {
        console.warn("[Location Create] Google Place ID lookup failed (non-blocking):", googleError.message);
      }

      return {
        status: true,
        message: "Location created successfully",
        data: newLocation,
      };
    } catch (error) {
      console.error("Create Location Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async delete(id, userId) {
    try {
      const location = await masterLocation.findByPk(id);
      if (!location) {
        return { status: false, message: "Location not found", data: null };
      }

      // Update deletedBy before destroying (soft-delete)
      location.deletedBy = userId;
      await location.save();
      await location.destroy();

      return {
        status: true,
        message: "Location deleted successfully",
        data: { id },
      };
    } catch (error) {
      console.error("Delete Location Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async update(id, data, files, userId) {
    try {
      const location = await masterLocation.findByPk(id);

      if (!location) {
        return { status: false, message: "Location not found", data: null };
      }

      if (location.isVerified) {
        const statusValue = data.isactive !== undefined ? data.isactive : data.isActive;
        if (statusValue !== undefined) {
          await location.update({ isactive: statusValue, updatedBy: userId });
          return {
            status: true,
            message: "Status updated successfully (other fields ignored because location is verified)",
            data: location,
          };
        }
        return {
          status: false,
          message: "Data lokasi sudah diverifikasi dan tidak dapat diubah",
          data: null,
        };
      }

      // Resolve Biteship area ID if updated and not provided
      const inputSubDist = data.subdistrict || data.subDistrict;
      const needsResolve = (inputSubDist && inputSubDist !== location.subdistrict) ||
        (data.postalCode && data.postalCode !== location.postalCode);

      if (needsResolve && !data.biteshipAreaId) {
        const subDist = inputSubDist || location.subdistrict;
        const dist = data.district || location.district;
        const distId = data.districtId || location.districtId;
        const cty = data.city || location.city;
        let pCode = data.postalCode || location.postalCode;

        // Try to find zipCode if missing
        if (!pCode && subDist && distId) {
          const localSubDist = await masterSubDistrict.findOne({
            where: { name: subDist, districtId: distId }
          });
          if (localSubDist) pCode = localSubDist.zipCode;
        }

        if (subDist && dist && cty) {
          const areaMatch = await getAreaByDetails(subDist, dist, cty, pCode);
          if (areaMatch) {
            data.biteshipAreaId = areaMatch.id;
            data.postalCode = data.postalCode || areaMatch.postal_code;

            // Back-fill local database
            if (subDist && distId && areaMatch.postal_code) {
              await masterSubDistrict.update(
                { zipCode: String(areaMatch.postal_code) },
                { where: { name: subDist, districtId: distId, zipCode: null } }
              ).catch(() => null);
            }
          }
        }

        // Fallback to postal code
        if (!data.biteshipAreaId && pCode) {
          data.biteshipAreaId = await searchArea(pCode).then(areas => {
            const exactMatch = areas.find(a => String(a.postal_code) === String(pCode));
            return exactMatch ? exactMatch.id : (areas[0] ? areas[0].id : null);
          }).catch(() => null);
        }
      }

      // Resolve Google Place ID if googleMapsUrl provided
      if (data.googleMapsUrl) {
        try {
          const googlePlacesService = require("./googlePlaces.service");
          const extractResult = await googlePlacesService.extractPlaceIdFromUrl(data.googleMapsUrl);
          if (extractResult.status) {
            data.googlePlaceId = extractResult.placeId;
          } else {
            console.warn(`[Location Update] Could not extract Place ID from URL: ${extractResult.message}`);
          }
        } catch (googleError) {
          console.warn("[Location Update] Google Place ID lookup failed (non-blocking):", googleError.message);
        }
      }

      await location.update({
        ...data,
        updatedBy: userId,
      });

      // Auto-sync rating if googlePlaceId provided/updated
      if (data.googlePlaceId) {
        try {
          const googlePlacesService = require("./googlePlaces.service");
          const syncResult = await googlePlacesService.syncLocationRating(id);
          if (syncResult.status) {
            // Re-fetch location to get updated rating data (optional, but good for returning data)
            await location.reload();
            console.log(`[Location Update] Google rating synced: ${syncResult.data.googleRating} (${syncResult.data.googleRatingCount} reviews)`);
          }
        } catch (syncErr) {
          console.warn("[Location Update] Google rating sync failed (non-blocking):", syncErr.message);
        }
      }

      if (files && files.length > 0) {
        for (const file of files) {
          await masterLocationImage.create({
            locationId: id,
            imageUrl: file.path,
          });
        }
      }

      return {
        status: true,
        message: "Location updated successfully",
        data: location,
      };
    } catch (error) {
      console.error("Update Location Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async updateStatus(id, isactive, userId) {
    try {
      const location = await masterLocation.findByPk(id);
      if (!location) {
        return { status: false, message: "Location not found", data: null };
      }
      location.isactive = isactive;
      location.updatedBy = userId;
      await location.save();

      return {
        status: true,
        message: "Status updated successfully",
        data: location,
      };
    } catch (error) {
      console.error("Update status error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async removePremium(id, userId) {
    try {
      const location = await masterLocation.findByPk(id);
      if (!location) {
        return { status: false, message: "Location not found", data: null };
      }
      location.isPremium = false;
      location.premiumExpiredAt = null;
      location.updatedBy = userId;
      await location.save();

      return {
        status: true,
        message: "Premium status removed successfully",
        data: location,
      };
    } catch (error) {
      console.error("Remove premium error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async detail(id) {
    try {
      const location = await masterLocation.findByPk(id, {
        include: [
          { model: masterCompany, as: "company" },
          { model: masterUser, as: "creator" },
          { model: masterUser, as: "updater" },
          { model: masterLocationImage, as: "images" },
          { model: masterCity, as: "cityDetail" },
          {
            model: LocationVerificationRequest,
            as: "verificationRequests",
            required: false,
            order: [["createdAt", "DESC"]],
            limit: 1,
          },
        ],
      });

      if (!location) {
        return { status: false, message: "Location not found", data: null };
      }

      const plain = location.get({ plain: true });
      const googleMapsUrl = plain.googlePlaceId
          ? `https://www.google.com/maps/search/?api=1&query=${plain.latitude || 0},${plain.longitude || 0}&query_place_id=${plain.googlePlaceId}`
          : (plain.latitude && plain.longitude ? `https://www.google.com/maps?q=${plain.latitude},${plain.longitude}` : null);
      
      plain.googleMapsUrl = googleMapsUrl;
      plain.city = plain.cityDetail ? plain.cityDetail.name : plain.city;

      return { status: true, message: "Location found", data: plain };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  }

  async list() {
    try {
      const locations = await masterLocation.findAll({
        include: [
          { model: masterCompany, as: "company" },
          { model: masterUser, as: "creator" },
          { model: masterUser, as: "updater" },
          { model: masterLocationImage, as: "images" },
          {
            model: LocationVerificationRequest,
            as: "verificationRequests",
            required: false,
            order: [["createdAt", "DESC"]],
            limit: 1,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const processedLocations = locations.map(loc => {
        const plain = loc.get({ plain: true });
        const isPremiumValid = !!(plain.premiumExpiredAt && new Date() < new Date(plain.premiumExpiredAt));
        return { ...plain, isPremium: isPremiumValid };
      });

      return { status: true, message: "Location list", data: processedLocations };
    } catch (error) {
      console.error("List error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async getByCityId(cityId) {
    try {
      if (!cityId) return { status: false, message: "Data tidak lengkap" };

      const locations = await masterLocation.findAll({
        where: { cityId },
        include: [
          {
            model: masterLocationImage,
            as: "images",
            attributes: ["id", "imageUrl"],
          },
        ],
        order: [["createdAt", "DESC"]],
        attributes: ["id", "name"],
      });

      if (!locations) {
        return {
          status: false,
          message: "Data outlet tidak ditemukan",
          data: null,
        };
      }

      return {
        status: true,
        message: "Success",
        data: locations,
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  }

  async getByCompanyId(companyId) {
    try {
      if (!companyId) return { status: false, message: "Data tidak lengkap" };

      const locations = await masterLocation.findAll({
        where: { companyId },
        order: [["createdAt", "DESC"]],
      });

      if (!locations) {
        return {
          status: false,
          message: "Data outlet tidak ditemukan",
          data: null,
        };
      }

      return {
        status: true,
        message: "Success",
        data: locations,
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  }

  async deleteImage(imageId) {
    try {
      const image = await masterLocationImage.findByPk(imageId);

      if (!image) {
        return { status: false, message: "Image not found", data: null };
      }
      if (image.imageUrl && fs.existsSync(image.imageUrl)) {
        fs.unlinkSync(image.imageUrl);
      }

      await image.destroy();

      return {
        status: true,
        message: "Image deleted successfully",
        data: { id: imageId },
      };
    } catch (error) {
      console.error("Delete Image Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async getLocationByUser({ id: userId, roleCode, locationIds, name }, pagination = {}) {
    try {
      const { limit, offset } = pagination;
      const options = {
        where: {},
        include: [
          {
            model: masterLocationImage,
            as: "images",
            separate: true,
          },
          {
            model: requestVerification,
            as: "verificationStatus",
            attributes: ["status"],
            required: false,
          },
        ],
        distinct: true, // Important for findAndCountAll with includes
        limit,
        offset,
      };

      if (name) {
        options.where.name = { [Op.like]: `%${name}%` };
      }

      if (!locationIds || locationIds.length === 0) {
        if (roleCode === "COMPANY_ADMIN") {
          const companyIds = await relationshipUserCompany
            .findAll({
              where: { userId },
              attributes: ["companyId"],
              raw: true,
            })
            .then((res) => res.map((r) => r.companyId));

          if (companyIds.length) {
            locationIds = await masterLocation
              .findAll({
                where: {
                  companyId: { [Op.in]: companyIds },
                },
                attributes: ["id"],
                raw: true,
              })
              .then((res) => res.map((r) => r.id));
          }
        } else if (roleCode !== "SUPER_ADMIN") {
          locationIds = await relationshipUserLocation
            .findAll({
              where: { userId },
              attributes: ["locationId"],
              raw: true,
            })
            .then((res) => res.map((r) => r.locationId));
        }
      }

      if (roleCode !== "SUPER_ADMIN") {
        options.where.id = { [Op.in]: locationIds };
      }

      const { count, rows } = await masterLocation.findAndCountAll(options);

      const mappedData = rows.map((loc) => {
        const plain = loc.get({ plain: true });
        return {
          ...plain,
          statusVerification: plain.verificationStatus?.status || null,
        };
      });

      return {
        status: true,
        message: "Location fetched successfully",
        data: mappedData,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async detailLocationByCustomer(
    id,
    customerId = null,
    latt = null,
    long = null
  ) {
    try {
      const include = [{ model: masterLocationImage, as: "images" }];

      if (customerId) {
        include.push({
          model: customerFavorites,
          as: "favorites",
          attributes: ["id"],
          where: { customerId, favoriteType: "location" },
          required: false,
        });
      }

      const location = await masterLocation.findOne({
        where: { id, isactive: true, isVerified: true },
        include
      });

      if (!location) {
        return { status: false, message: "Location not found or not verified", data: null };
      }

      const plain = location.get({ plain: true });

      let distance = 0;
      if (latt && long && plain.latitude && plain.longitude) {
        const R = 6371000; // Radius of the Earth in meters
        const lat1 = parseFloat(latt);
        const lon1 = parseFloat(long);
        const lat2 = parseFloat(plain.latitude);
        const lon2 = parseFloat(plain.longitude);

        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        distance = Math.round(R * c);
      }

      const isPremiumValid = !!(plain.premiumExpiredAt && new Date() < new Date(plain.premiumExpiredAt));

      return {
        status: true,
        message: "Location found",
        data: {
          ...plain,
          isPremium: isPremiumValid,
          isFavorite: plain.favorites?.length > 0 || false,
          distance: distance,
          favorites: undefined,
        },
      };
    } catch (error) {
      console.error("Detail error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async listLocationByCustomer(
    customerId = null,
    latt = null,
    long = null,
    name = null,
    radius = null,
    cityId = null
  ) {
    try {
      const include = [{ model: masterLocationImage, as: "images" }];

      if (customerId) {
        include.push({
          model: customerFavorites,
          as: "favorites",
          where: { customerId, favoriteType: "location" },
          required: false,
        });
      }

      const where = { isactive: true, isVerified: true };
      if (name) {
        where.name = { [Op.like]: `%${name}%` };
      }
      if (cityId) {
        where.cityId = cityId;
      }

      const locations = await masterLocation.findAll({
        where,
        include,
        order: [
          ["isPremium", "DESC"],
          ["createdAt", "DESC"],
        ],
      });

      if (!locations) {
        return { status: false, message: "Location not found", data: null };
      }

      const result = locations.map((loc) => {
        const plain = loc.get({ plain: true });

        let distance = 0;
        if (latt && long && plain.latitude && plain.longitude) {
          const lat1 = parseFloat(latt);
          const lon1 = parseFloat(long);
          const lat2 = parseFloat(plain.latitude);
          const lon2 = parseFloat(plain.longitude);

          const R = 6371e3; // meters
          const φ1 = (lat1 * Math.PI) / 180;
          const φ2 = (lat2 * Math.PI) / 180;
          const Δφ = ((lat2 - lat1) * Math.PI) / 180;
          const Δλ = ((lon2 - lon1) * Math.PI) / 180;

          const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          distance = Math.round(R * c);
        }

        const isPremiumValid = !!(plain.premiumExpiredAt && new Date() < new Date(plain.premiumExpiredAt));

        return {
          ...plain,
          address: undefined,
          province: undefined,
          district: undefined,
          subdistrict: undefined,
          postalCode: undefined,
          cityId: undefined,
          districtId: undefined,
          latitude: undefined,
          longitude: undefined,
          phone: undefined,
          email: undefined,
          bankName: undefined,
          bankAccountName: undefined,
          bankAccountNumber: undefined,
          xenditAccountId: undefined,
          googlePlaceId: undefined,
          isPremium: isPremiumValid,
          isFavorite: customerId
            ? plain.favorites && plain.favorites.length > 0
            : false,
          distance: distance,
          favorites: undefined,
        };
      });

      if (radius && latt && long) {
        const radiusInMeters = parseFloat(radius) * 1000;
        return {
          status: true,
          message: "Location list",
          data: result.filter((loc) => loc.distance <= radiusInMeters),
        };
      }

      return { status: true, message: "Location list", data: result };
    } catch (error) {
      console.error("List error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async getNewArrivalOutlets(latt = null, long = null) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const locations = await masterLocation.findAll({
        where: {
          isVerified: true,
          isactive: true,
          [Op.or]: [
            { verifiedDate: { [Op.gte]: thirtyDaysAgo } },
            {
              [Op.and]: [
                { verifiedDate: null },
                { createdAt: { [Op.gte]: thirtyDaysAgo } }
              ]
            }
          ]
        },
        include: [{ model: masterLocationImage, as: "images" }],
        order: [
          [Sequelize.literal('COALESCE(masterLocation.verifiedDate, masterLocation.createdAt)'), 'DESC']
        ],
      });

      const result = locations.map((loc) => {
        const plain = loc.get({ plain: true });

        let distance = 0;
        if (latt && long && plain.latitude && plain.longitude) {
          const lat1 = parseFloat(latt);
          const lon1 = parseFloat(long);
          const lat2 = parseFloat(plain.latitude);
          const lon2 = parseFloat(plain.longitude);

          const R = 6371e3; // meters
          const φ1 = (lat1 * Math.PI) / 180;
          const φ2 = (lat2 * Math.PI) / 180;
          const Δφ = ((lat2 - lat1) * Math.PI) / 180;
          const Δλ = ((lon2 - lon1) * Math.PI) / 180;

          const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          distance = Math.round(R * c);
        }

        const isPremiumValid = !!(plain.premiumExpiredAt && new Date() < new Date(plain.premiumExpiredAt));

        return {
          ...plain,
          isPremium: isPremiumValid,
          distance: distance,
        };
      });

      return {
        status: true,
        message: "Successfully fetched newly added outlets",
        data: result,
      };
    } catch (error) {
      console.error("Get New Arrival Outlets Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async getPremiumLocations(latt = null, long = null, pagination = {}) {
    try {
      const { limit, offset } = pagination;
      const now = new Date();
      const { count, rows: locations } = await masterLocation.findAndCountAll({
        where: {
          isactive: true,
          isVerified: true,
          isPremium: true,
          premiumExpiredAt: { [Op.gt]: now }
        },
        include: [{ model: masterLocationImage, as: "images" }],
        distinct: true,
        limit,
        offset,
        subQuery: false,
        order: [["createdAt", "DESC"]],
      });

      const result = locations.map((loc) => {
        const plain = loc.get({ plain: true });

        let distance = 0;
        if (latt && long && plain.latitude && plain.longitude) {
          const lat1 = parseFloat(latt);
          const lon1 = parseFloat(long);
          const lat2 = parseFloat(plain.latitude);
          const lon2 = parseFloat(plain.longitude);

          const R = 6371e3; // meters
          const φ1 = (lat1 * Math.PI) / 180;
          const φ2 = (lat2 * Math.PI) / 180;
          const Δφ = ((lat2 - lat1) * Math.PI) / 180;
          const Δλ = ((lon2 - lon1) * Math.PI) / 180;

          const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          distance = Math.round(R * c);
        }

        return {
          id: plain.id,
          name: plain.name,
          code: plain.code,
          address: plain.address,
          phone: plain.phone,
          operationHours: plain.operationHours,
          operationDays: plain.operationDays,
          latitude: plain.latitude,
          longitude: plain.longitude,
          isactive: plain.isactive,
          isPremium: true,
          premiumExpiredAt: plain.premiumExpiredAt,
          ratingAvg: plain.ratingAvg,
          ratingCount: plain.ratingCount,
          googleRating: plain.googleRating,
          googleRatingCount: plain.googleRatingCount,
          distance: distance,
          images: plain.images ? plain.images.map(img => ({
            id: img.id,
            imageUrl: img.imageUrl
          })) : []
        };
      });

      return {
        status: true,
        message: "Successfully fetched premium locations",
        data: result,
        totalCount: count,
      };
    } catch (error) {
      console.error("Get Premium Locations Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async getMyPremiumStatus(locationIds, latt = null, long = null) {
    try {
      if (!locationIds || locationIds.length === 0) {
        return { status: false, message: "User tidak terdaftar di outlet manapun", data: null };
      }

      const locations = await masterLocation.findAll({
        where: {
          id: { [Op.in]: locationIds }
        },
        include: [{ model: masterLocationImage, as: "images" }],
      });

      if (!locations || locations.length === 0) {
        return { status: false, message: "Outlet tidak ditemukan", data: null };
      }

      const result = locations.map((loc) => {
        const plain = loc.get({ plain: true });

        let distance = 0;
        if (latt && long && plain.latitude && plain.longitude) {
          const lat1 = parseFloat(latt);
          const lon1 = parseFloat(long);
          const lat2 = parseFloat(plain.latitude);
          const lon2 = parseFloat(plain.longitude);

          const R = 6371e3; // meters
          const φ1 = (lat1 * Math.PI) / 180;
          const φ2 = (lat2 * Math.PI) / 180;
          const Δφ = ((lat2 - lat1) * Math.PI) / 180;
          const Δλ = ((lon2 - lon1) * Math.PI) / 180;

          const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          distance = Math.round(R * c);
        }

        const isPremiumValid = !!(plain.premiumExpiredAt && new Date() < new Date(plain.premiumExpiredAt));

        return {
          id: plain.id,
          name: plain.name,
          code: plain.code,
          address: plain.address,
          phone: plain.phone,
          operationHours: plain.operationHours,
          operationDays: plain.operationDays,
          latitude: plain.latitude,
          longitude: plain.longitude,
          isactive: plain.isactive,
          isPremium: isPremiumValid,
          premiumExpiredAt: plain.premiumExpiredAt,
          ratingAvg: plain.ratingAvg,
          ratingCount: plain.ratingCount,
          googleRating: plain.googleRating,
          googleRatingCount: plain.googleRatingCount,
          distance: distance,
          images: plain.images ? plain.images.map(img => ({
            id: img.id,
            imageUrl: img.imageUrl
          })) : []
        };
      });

      return {
        status: true,
        message: "Berhasil mengambil data outlet",
        data: result,
      };
    } catch (error) {
      console.error("Get My Premium Status Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async getCityByLatitudeLongitude(latitude, longitude) {
    try {
      if (latitude == null || longitude == null) {
        return {
          status: false,
          message: "Latitude and Longitude are required",
        };
      }

      // pastikan angka (menghindari SQL injection + error query)
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      const distanceLiteral = Sequelize.literal(`
        6371 * acos(
          cos(radians(${lat})) *
          cos(radians(CAST(masterCity.latitude AS FLOAT))) *
          cos(radians(CAST(masterCity.longitude AS FLOAT)) - radians(${lng})) +
          sin(radians(${lat})) *
          sin(radians(CAST(masterCity.latitude AS FLOAT)))
        )
      `);

      const city = await masterCity.findOne({
        attributes: {
          include: [[distanceLiteral, "distance"]],
        },
        include: [{ model: masterProvince, as: "province" }],
        order: [[distanceLiteral, "ASC"]],
        limit: 1,
      });

      if (!city) {
        return { status: false, message: "City not found in database" };
      }

      return {
        status: true,
        message: "City found",
        data: city,
      };
    } catch (error) {
      console.error("Get City By Coords Error:", error);
      return { status: false, message: error.message };
    }
  }

  async getDistrictByLatitudeLongitude(latitude, longitude) {
    try {
      // validasi: jangan pakai !latitude karena 0 dianggap false
      if (latitude == null || longitude == null) {
        return {
          status: false,
          message: "Latitude and Longitude are required",
        };
      }

      // pastikan angka (lebih aman)
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      const distanceLiteral = Sequelize.literal(`
        6371 * acos(
          cos(radians(${lat})) *
          cos(radians(CAST(masterDistrict.latitude AS FLOAT))) *
          cos(radians(CAST(masterDistrict.longitude AS FLOAT)) - radians(${lng})) +
          sin(radians(${lat})) *
          sin(radians(CAST(masterDistrict.latitude AS FLOAT)))
        )
      `);

      const district = await masterDistrict.findOne({
        attributes: {
          include: [[distanceLiteral, "distance"]],
        },
        include: [{ model: masterCity, as: "city" }],
        order: [[distanceLiteral, "ASC"]],
        limit: 1,
      });

      if (!district) {
        return {
          status: false,
          message: "District not found in database",
        };
      }

      return {
        status: true,
        message: "District found",
        data: district,
      };
    } catch (error) {
      console.error("Get District By Coords Error:", error);
      return { status: false, message: error.message };
    }
  }

  async getCities() {
    try {
      const cities = await masterCity.findAll({
        attributes: ["id", "name"],
      });
      return {
        status: true,
        message: "Cities fetched successfully",
        data: cities,
      };
    } catch (error) {
      console.error("Get Cities Error:", error);
      return { status: false, message: error.message };
    }
  }

  async upsertProvince(data) {
    try {
      await masterProvince.upsert({
        id: data.id,
        name: data.name,
      });
    } catch (error) {
      console.error("Error upserting province:", error);
      throw error;
    }
  }

  async upsertCity(data, provinceId) {
    try {
      await masterCity.upsert({
        id: data.id,
        provinceId: provinceId,
        name: data.name,
      });
    } catch (error) {
      console.error("Error upserting city:", error);
      throw error;
    }
  }

  async upsertDistrict(data, cityId) {
    try {
      await masterDistrict.upsert({
        id: data.id,
        cityId: cityId,
        name: data.name,
      });
    } catch (error) {
      console.error("Error upserting district:", error);
      throw error;
    }
  }

  async syncRegions() {
    try {
      console.log("--- Starting Robust Region Sync ---");
      const axios = require('axios');
      const { v4: uuidv4 } = require('uuid');
      const BASE_URL = "https://www.emsifa.com/api-wilayah-indonesia/api";

      // 1. Ensure 38 Provinces exist (handle emsifa's 34 limit)
      const targetProvinces = [
        "ACEH", "SUMATERA UTARA", "SUMATERA BARAT", "RIAU", "JAMBI", "SUMATERA SELATAN",
        "BENGKULU", "LAMPUNG", "KEPULAUAN BANGKA BELITUNG", "KEPULAUAN RIAU", "DKI JAKARTA",
        "JAWA BARAT", "JAWA TENGAH", "DI YOGYAKARTA", "JAWA TIMUR", "BANTEN", "BALI",
        "NUSA TENGGARA BARAT", "NUSA TENGGARA TIMUR", "KALIMANTAN BARAT", "KALIMANTAN TENGAH",
        "KALIMANTAN SELATAN", "KALIMANTAN TIMUR", "KALIMANTAN UTARA", "SULAWESI UTARA",
        "SULAWESI TENGAH", "SULAWESI SELATAN", "SULAWESI TENGGARA", "GORONTALO", "SULAWESI BARAT",
        "MALUKU", "MALUKU UTARA", "PAPUA BARAT", "PAPUA", "PAPUA SELATAN", "PAPUA TENGAH",
        "PAPUA PEGUNUNGAN", "PAPUA BARAT DAYA"
      ];

      for (const name of targetProvinces) {
        let province = await masterProvince.findOne({
          where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), name.toLowerCase())
        });
        if (!province) {
          await masterProvince.create({ name });
          console.log(`  Added missing province: ${name}`);
        }
      }

      const provRes = await axios.get(`${BASE_URL}/provinces.json`);
      const provinces = provRes.data;

      for (const p of provinces) {
        console.log(`Syncing Data for: ${p.name}`);

        let provinceRecord = await masterProvince.findOne({
          where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), p.name.toLowerCase())
        });

        if (!provinceRecord) continue;

        if (provinceRecord.id.length < 36) {
          const newUuid = uuidv4();
          const oldId = provinceRecord.id;
          await masterProvince.update({ id: newUuid }, { where: { id: oldId } });
          await masterCity.update({ provinceId: newUuid }, { where: { provinceId: oldId } });
          provinceRecord = await masterProvince.findByPk(newUuid);
        }

        const cityRes = await axios.get(`${BASE_URL}/regencies/${p.id}.json`);
        const cities = cityRes.data;

        for (const c of cities) {
          let cityRecord = await masterCity.findOne({
            where: {
              [Op.and]: [
                sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), c.name.toLowerCase()),
                { provinceId: provinceRecord.id }
              ]
            }
          });

          if (!cityRecord) {
            cityRecord = await masterCity.create({ name: c.name, provinceId: provinceRecord.id });
          } else if (cityRecord.id.length < 36) {
            const newUuid = uuidv4();
            const oldId = cityRecord.id;
            await masterCity.update({ id: newUuid }, { where: { id: oldId } });
            await masterDistrict.update({ cityId: newUuid }, { where: { cityId: oldId } });
            cityRecord = await masterCity.findByPk(newUuid);
          }

          const distRes = await axios.get(`${BASE_URL}/districts/${c.id}.json`);
          const districts = distRes.data;

          for (const d of districts) {
            let districtRecord = await masterDistrict.findOne({
              where: {
                [Op.and]: [
                  sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), d.name.toLowerCase()),
                  { cityId: cityRecord.id }
                ]
              }
            });

            if (!districtRecord) {
              districtRecord = await masterDistrict.create({ name: d.name, cityId: cityRecord.id });
            } else if (districtRecord.id.length < 36) {
              const newUuid = uuidv4();
              const oldId = districtRecord.id;
              await masterDistrict.update({ id: newUuid }, { where: { id: oldId } });
              await masterSubDistrict.update({ districtId: newUuid }, { where: { districtId: oldId } });
              districtRecord = await masterDistrict.findByPk(newUuid);
            }

            const existingSubCount = await masterSubDistrict.count({
              where: { districtId: districtRecord.id }
            });

            if (existingSubCount === 0) {
              const villageRes = await axios.get(`${BASE_URL}/villages/${d.id}.json`);
              const villages = villageRes.data;

              if (villages.length > 0) {
                const villageData = villages.map(v => ({
                  name: v.name,
                  districtId: districtRecord.id
                }));
                await masterSubDistrict.bulkCreate(villageData);
              }
            }
          }
        }
      }

      return {
        status: true,
        message: "Full administrative regions sync completed (38 Provinces, UUID Integrity)",
        data: null,
      };
    } catch (error) {
      console.error("Sync Regions Error:", error);
      return { status: false, message: error.message, data: null };
    }
  }

  async injectDataRegion() {
    return await this.syncRegions();
  }

  // --- PROVINCE CRUD ---
  async listProvince(name) {
    try {
      const where = {};
      if (name) where.name = { [Op.like]: `%${name}%` };

      const provinces = await masterProvince.findAll({
        where,
        order: [["name", "ASC"]],
      });
      return { status: true, message: "Province list", data: provinces };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async detailProvince(id) {
    try {
      const province = await masterProvince.findByPk(id);
      if (!province) return { status: false, message: "Province not found" };
      return { status: true, message: "Province found", data: province };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async createProvince(data) {
    try {
      const province = await masterProvince.create(data);
      return { status: true, message: "Province created", data: province };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async updateProvince(id, data) {
    try {
      const province = await masterProvince.findByPk(id);
      if (!province) return { status: false, message: "Province not found" };
      await province.update(data);
      return { status: true, message: "Province updated", data: province };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async deleteProvince(id) {
    try {
      const province = await masterProvince.findByPk(id);
      if (!province) return { status: false, message: "Province not found" };
      await province.destroy();
      return { status: true, message: "Province deleted" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  // --- CITY CRUD ---
  async listCity(provinceId, name) {
    try {
      const where = {};
      if (provinceId) where.provinceId = provinceId;
      if (name) where.name = { [Op.like]: `%${name}%` };

      const cities = await masterCity.findAll({
        where,
        include: [{ model: masterProvince, as: "province" }],
        order: [["name", "ASC"]],
      });
      return { status: true, message: "City list", data: cities };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async detailCity(id) {
    try {
      const city = await masterCity.findByPk(id, {
        include: [{ model: masterProvince, as: "province" }],
      });
      if (!city) return { status: false, message: "City not found" };
      return { status: true, message: "City found", data: city };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async createCity(data) {
    try {
      const city = await masterCity.create(data);
      return { status: true, message: "City created", data: city };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async updateCity(id, data) {
    try {
      const city = await masterCity.findByPk(id);
      if (!city) return { status: false, message: "City not found" };
      await city.update(data);
      return { status: true, message: "City updated", data: city };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async deleteCity(id) {
    try {
      const city = await masterCity.findByPk(id);
      if (!city) return { status: false, message: "City not found" };
      await city.destroy();
      return { status: true, message: "City deleted" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  // --- DISTRICT CRUD ---
  async listDistrict(cityId, name) {
    try {
      const where = {};
      if (cityId) where.cityId = cityId;
      if (name) where.name = { [Op.like]: `%${name}%` };

      const districts = await masterDistrict.findAll({
        where,
        include: [{ model: masterCity, as: "city" }],
        order: [["name", "ASC"]],
      });
      return { status: true, message: "District list", data: districts };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async detailDistrict(id) {
    try {
      const district = await masterDistrict.findByPk(id, {
        include: [{ model: masterCity, as: "city" }],
      });
      if (!district) return { status: false, message: "District not found" };
      return { status: true, message: "District found", data: district };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async createDistrict(data) {
    try {
      const district = await masterDistrict.create(data);
      return { status: true, message: "District created", data: district };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async updateDistrict(id, data) {
    try {
      const district = await masterDistrict.findByPk(id);
      if (!district) return { status: false, message: "District not found" };
      await district.update(data);
      return { status: true, message: "District updated", data: district };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async deleteDistrict(id) {
    try {
      const district = await masterDistrict.findByPk(id);
      if (!district) return { status: false, message: "District not found" };
      await district.destroy();
      return { status: true, message: "District deleted" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  // --- SUB DISTRICT CRUD ---
  async listSubDistrict(districtId, name, cityId) {
    try {
      const where = {};
      if (districtId) where.districtId = districtId;
      if (name) where.name = { [Op.like]: `%${name}%` };

      const districtWhere = {};
      if (cityId) districtWhere.cityId = cityId;

      const subDistricts = await masterSubDistrict.findAll({
        where,
        include: [
          {
            model: masterDistrict,
            as: "district",
            where: Object.keys(districtWhere).length > 0 ? districtWhere : undefined,
            required: Object.keys(districtWhere).length > 0,
            include: [{ model: masterCity, as: "city" }],
          },
        ],
        order: [["name", "ASC"]],
      });
      return {
        status: true,
        message: "Sub-district list",
        data: subDistricts,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async detailSubDistrict(id, cityId) {
    try {
      const districtWhere = {};
      if (cityId) districtWhere.cityId = cityId;

      const subDistrict = await masterSubDistrict.findByPk(id, {
        include: [
          {
            model: masterDistrict,
            as: "district",
            where: Object.keys(districtWhere).length > 0 ? districtWhere : undefined,
            required: Object.keys(districtWhere).length > 0,
            include: [{ model: masterCity, as: "city" }],
          },
        ],
      });
      if (!subDistrict)
        return { status: false, message: "Sub-district not found" };
      return {
        status: true,
        message: "Sub-district found",
        data: subDistrict,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async createSubDistrict(data) {
    try {
      const subDistrict = await masterSubDistrict.create(data);
      return {
        status: true,
        message: "Sub-district created",
        data: subDistrict,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async updateSubDistrict(id, data) {
    try {
      const subDistrict = await masterSubDistrict.findByPk(id);
      if (!subDistrict)
        return { status: false, message: "Sub-district not found" };
      await subDistrict.update(data);
      return {
        status: true,
        message: "Sub-district updated",
        data: subDistrict,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }

  async deleteSubDistrict(id) {
    try {
      const subDistrict = await masterSubDistrict.findByPk(id);
      if (!subDistrict)
        return { status: false, message: "Sub-district not found" };
      await subDistrict.destroy();
      return { status: true, message: "Sub-district deleted" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }
}

module.exports = new MasterLocationService();
