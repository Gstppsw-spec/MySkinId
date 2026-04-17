const {
  masterService,
  masterSubCategoryService,
  masterLocation,
  masterLocationImage,
  customerFavorites,
  relationshipServiceLocation,
  relationshipUserLocation,
  requestVerification,
  relationshipUserCompany,
} = require("../models");

const { Op, Sequelize } = require("sequelize");
const { sortPrimaryFirst } = require("../helpers/sortPrimaryImage");

/**
 * Helper: backward compat — add singular location/locationId from locations array
 */
function mapServiceWithBackwardCompat(plain) {
  const firstLoc = plain.locations?.[0] || null;
  return {
    ...plain,
    locationId: firstLoc?.id || null,
    location: firstLoc,
  };
}

module.exports = {
  async getAll(filters = {}, pagination = {}) {
    try {
      const {
        name,
        minPrice,
        maxPrice,
        categoryIds,
        userLat,
        userLng,
        maxDistance,
        sortBy,
        customerId,
        isCustomer,
      } = filters;

      const { limit, offset } = pagination;

      const where = {};

      if (name) {
        // Use BINARY for case-sensitive search as requested
        where.name = Sequelize.where(
          Sequelize.fn("BINARY", Sequelize.col("masterService.name")),
          { [Op.like]: `%${name}%` },
        );
      }

      if (isCustomer == 1 || isCustomer == "1") {
        where.isActive = true;
        where.isVerified = true;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where[Op.and] = Sequelize.literal(`
          (\`masterService\`.price - (\`masterService\`.price * \`masterService\`.discountPercent / 100))
          BETWEEN ${minPrice || 0} AND ${maxPrice || 9999999}
        `);
      }

      const distanceLiteral =
        userLat && userLng
          ? Sequelize.literal(`
            6371 * acos(
              cos(radians(${userLat})) *
              cos(radians(CAST(\`locations\`.latitude AS FLOAT))) *
              cos(radians(CAST(\`locations\`.longitude AS FLOAT)) - radians(${userLng})) +
              sin(radians(${userLat})) *
              sin(radians(CAST(\`locations\`.latitude AS FLOAT)))
            )
          `)
          : null;

      // Pivot through config
      const throughConfig = {
        attributes: ["isActive"],
      };
      if (isCustomer == 1 || isCustomer == "1") {
        throughConfig.where = { isActive: true };
      }

      const include = [
        {
          model: masterSubCategoryService,
          as: "categories",
          through: { attributes: [] },
          where: categoryIds ? { id: { [Op.in]: categoryIds } } : undefined,
          required: !!categoryIds,
          attributes: ["id", "name"],
        },
        {
          model: masterLocation,
          as: "locations",
          through: throughConfig,
          attributes: [
            "id",
            "name",
            "latitude",
            "longitude",
            "district",
            ...(distanceLiteral ? [[distanceLiteral, "distance"]] : []),
          ],
          required: !!(userLat && userLng),
          ...(distanceLiteral && maxDistance
            ? {
              where: Sequelize.where(distanceLiteral, {
                [Op.lte]: maxDistance,
              }),
            }
            : {}),
          include: [
            {
              model: masterLocationImage,
              as: "images",
              attributes: ["id", "imageUrl"],
              limit: 1,
              separate: true,
            },
          ],
        },
      ];

      let order = [["name", "ASC"]];

      if (sortBy === "distance" && distanceLiteral) {
        order = [[distanceLiteral, "ASC"]];
      }

      if (sortBy === "price" || sortBy === "low-price") {
        order = [
          [
            Sequelize.literal(
              "(`masterService`.price - (`masterService`.price * `masterService`.discountPercent / 100))",
            ),
            "ASC",
          ],
        ];
      }

      if (sortBy === "high-price") {
        order = [
          [
            Sequelize.literal(
              "(`masterService`.price - (`masterService`.price * `masterService`.discountPercent / 100))",
            ),
            "DESC",
          ],
        ];
      }

      if (sortBy === "rating") {
        order = [["ratingAvg", "DESC"]];
      }

      if (!sortBy || sortBy === "recommendation") {
        order = [];
        if (distanceLiteral) {
          order.push([distanceLiteral, "ASC"]);
        }
        order.push(["ratingAvg", "DESC"]);
        order.push(["name", "ASC"]);
      }

      if (customerId) {
        include.push({
          model: customerFavorites,
          as: "favorites",
          attributes: ["id"],
          where: {
            customerId,
            favoriteType: "service",
          },
          required: false,
        });
      }

      const { count, rows: services } = await masterService.findAndCountAll({
        where,
        include,
        order,
        limit,
        offset,
        subQuery: false,
        distinct: true,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
      });

      if (!services) {
        return {
          status: false,
          message: "Layanan tidak ditemukan",
          data: null,
        };
      }

      const result = services.flatMap((prod) => {
        const plain = prod.get({ plain: true });
        // Sort primary images first in nested locations
        if (plain.locations) {
          plain.locations = plain.locations.map(loc => {
            if (loc.images) loc.images = sortPrimaryFirst(loc.images);
            return loc;
          });
        }

        if (plain.locations && plain.locations.length > 0) {
          return plain.locations.map(loc => {
            return {
              ...plain,
              isFavorite: customerId
                ? plain.favorites && plain.favorites.length > 0
                : false,
              favorites: undefined,
              locationId: loc.id,
              location: loc
            };
          });
        }

        return [{
          ...plain,
          isFavorite: customerId
            ? plain.favorites && plain.favorites.length > 0
            : false,
          favorites: undefined,
          locationId: null,
          location: null
        }];
      });
      return {
        status: true,
        message: "Success",
        data: result,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getById(id, customerId, userLat, userLng) {
    try {
      const distanceLiteral =
        userLat && userLng
          ? Sequelize.literal(`
            6371 * acos(
              cos(radians(${userLat})) *
              cos(radians(CAST(\`locations\`.latitude AS FLOAT))) *
              cos(radians(CAST(\`locations\`.longitude AS FLOAT)) - radians(${userLng})) +
              sin(radians(${userLat})) *
              sin(radians(CAST(\`locations\`.latitude AS FLOAT)))
            )
          `)
          : null;

      const include = [
        {
          model: masterLocation,
          as: "locations",
          through: { attributes: ["isActive"] },
          attributes: [
            "id",
            "name",
            "latitude",
            "longitude",
            "address",
            "district",
            ...(distanceLiteral ? [[distanceLiteral, "distance"]] : []),
          ],
          include: [
            {
              model: masterLocationImage,
              as: "images",
              attributes: ["id", "imageUrl"],
              limit: 1,
              separate: true,
            },
          ],
        },
        {
          model: masterSubCategoryService,
          as: "categories",
          through: { attributes: [] },
          attributes: ["id", "name"],
        },
      ];

      if (customerId) {
        include.push({
          model: customerFavorites,
          as: "favorites",
          attributes: ["id"],
          where: {
            customerId,
            favoriteType: "service",
          },
          required: false,
        });
      }

      const service = await masterService.findByPk(id, {
        include,
      });

      if (!service) {
        return { status: false, message: "Service not found", data: null };
      }

      const plain = service.get({ plain: true });
      // Sort primary images first in nested locations
      if (plain.locations) {
        plain.locations = plain.locations.map(loc => {
          if (loc.images) loc.images = sortPrimaryFirst(loc.images);
          return loc;
        });
      }
      const mapped = mapServiceWithBackwardCompat(plain);

      return {
        status: true,
        message: "Success",
        data: {
          ...mapped,
          isFavorite: plain.favorites?.length > 0 || false,
          favorites: undefined,
        },
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async create(data) {
    try {
      const {
        name,
        description,
        compotition,
        postTreatmentCare,
        contraIndication,
        securityAndCertification,
        durationOfResults,
        indicationOfUse,
        benefit,
        duration,
        price,
        discountPercent = 0,
        isActive = true,
      } = data;

      const locationIds = data.locationIds || data["locationIds[]"];
      const categoryIds = data.categoryIds || data["categoryIds[]"];

      if (!name || name.trim() === "") {
        return {
          status: false,
          message: "Nama tidak boleh kosong",
          data: null,
        };
      }

      if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
        return {
          status: false,
          message: "Lokasi tidak boleh kosong (kirim locationIds array)",
          data: null,
        };
      }

      if (!price) {
        return {
          status: false,
          message: "Harga tidak boleh kosong",
          data: null,
        };
      }

      // Check for duplicates (including soft-deleted)
      const existing = await masterService.findOne({
        where: { name },
        paranoid: false,
      });

      if (existing) {
        if (existing.deletedAt) {
          // Restore and reuse
          await existing.restore();
          console.log(`[Service Create] Restored soft-deleted service with name: ${name}`);

          await existing.update({
            description,
            compotition,
            postTreatmentCare,
            contraIndication,
            securityAndCertification,
            durationOfResults,
            indicationOfUse,
            benefit,
            duration,
            price: Number(price),
            discountPercent,
            isActive,
            isVerified: false,
          });

          // Re-assign associations
          await existing.setLocations(locationIds);
          if (categoryIds && Array.isArray(categoryIds)) {
            await existing.setCategories(categoryIds);
          }

          return {
            status: true,
            message: "Service restored and updated successfully",
            data: existing,
          };
        }

        return {
          status: false,
          message: "Service with this name already exists",
          data: null,
        };
      }

      const newService = await masterService.create({
        name,
        description,
        compotition,
        postTreatmentCare,
        contraIndication,
        securityAndCertification,
        durationOfResults,
        indicationOfUse,
        benefit,
        duration,
        price: Number(price),
        discountPercent,
        isActive,
      });

      // Many-to-many: assign locations
      await newService.setLocations(locationIds);

      if (categoryIds && Array.isArray(categoryIds)) {
        await newService.setCategories(categoryIds);
      }
      return {
        status: true,
        message: "Service created successfully",
        data: newService,
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },

  async update(id, data) {
    try {
      const {
        name,
        description,
        compotition,
        postTreatmentCare,
        contraIndication,
        securityAndCertification,
        durationOfResults,
        indicationOfUse,
        benefit,
        duration,
        locationIds,
        price,
        discountPercent = 0,
        isActive = true,
        categoryIds,
      } = data;

      // Pastikan data service ada
      const service = await masterService.findByPk(id);
      if (!service) {
        return { status: false, message: "Service not found", data: null };
      }

      // Validasi name
      if (name && name.trim() === "") {
        return { status: false, message: "Name cannot be empty", data: null };
      }

      const np = Number(price ?? service.price);
      const dp = Number(discountPercent ?? service.discountPercent);

      // Update record
      await service.update({
        name,
        description,
        compotition,
        postTreatmentCare,
        contraIndication,
        securityAndCertification,
        durationOfResults,
        indicationOfUse,
        benefit,
        duration,
        price: np,
        discountPercent: dp,
        isActive,
      });

      // Many-to-many: update locations
      if (locationIds && Array.isArray(locationIds)) {
        await service.setLocations(locationIds);
      }

      if (categoryIds) {
        if (Array.isArray(categoryIds)) {
          await service.setCategories(categoryIds);
        } else {
          return {
            status: false,
            message: "categoryIds must be an array",
            data: null,
          };
        }
      }

      return {
        status: true,
        message: "Service updated successfully",
        data: service,
      };
    } catch (error) {
      console.error("Update Service Error:", error);
      return { status: false, message: error.message, data: null };
    }
  },

  async deleteService(id) {
    try {
      const service = await masterService.findByPk(id);

      if (!service) {
        return { status: false, message: "Service not found", data: null };
      }

      if (service.isVerified) {
        return {
          status: false,
          message: "Service sudah diverifikasi dan tidak dapat dihapus",
          data: null,
        };
      }

      await service.destroy(); // Soft delete because of paranoid true
      return {
        status: true,
        message: "Service deleted successfully",
        data: null,
      };
    } catch (error) {
      console.error("Delete Service Error:", error);
      return { status: false, message: error.message, data: null };
    }
  },

  async getByLocationId(locationId, customerId, isCustomer) {
    try {
      const where = {
        isActive: true,
        isVerified: true
      };

      const service = await masterService.findAll({
        where,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
        order: [["name", "ASC"]],
        include: [
          {
            model: masterSubCategoryService,
            as: "categories",
            through: { attributes: [] },
            attributes: ["id", "name"],
          },
          {
            model: masterLocation,
            as: "locations",
            where: { id: locationId },
            through: {
              attributes: ["isActive"],
              ...(isCustomer == 1 || isCustomer == "1" ? { where: { isActive: true } } : {}),
            },
            required: true,
          },
        ],
      });

      if (!service) {
        return { status: false, message: "Service not found", data: null };
      }

      const result = service.map((prod) => {
        const plain = prod.get({ plain: true });
        const mapped = mapServiceWithBackwardCompat(plain);
        return {
          ...mapped,
          isFavorite: customerId
            ? plain.favorites && plain.favorites.length > 0
            : false,
          favorites: undefined,
        };
      });
      return { status: true, message: "Success", data: result };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getServiceByUser({ id: userId, locationIds, roleCode }, filters = {}, pagination = {}) {
    try {
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
        } else if (roleCode !== "SUPER_ADMIN" && roleCode !== "OPERATIONAL_ADMIN") {
          locationIds = await relationshipUserLocation
            .findAll({
              where: { userId },
              attributes: ["locationId"],
              raw: true,
            })
            .then((res) => res.map((r) => r.locationId));
        }
      }

      const { name } = filters;
      const { limit, offset } = pagination;

      const whereClause = {};
      if (name) {
        whereClause.name = { [Op.like]: `%${name}%` };
      }

      const include = [
        {
          model: masterSubCategoryService,
          as: "categories",
          through: { attributes: [] },
          attributes: ["id", "name"],
        },
        {
          model: masterLocation,
          as: "locations",
          through: { attributes: ["isActive"] },
          attributes: ["id", "name", "latitude", "longitude"],
          include: [
            {
              model: masterLocationImage,
              as: "images",
              attributes: ["id", "imageUrl"],
              limit: 1,
              separate: true,
            },
          ],
        },
        {
          model: requestVerification,
          as: "verificationStatus",
          attributes: ["status", "note"],
          required: false,
        },
      ];

      let finalInclude;
      if (roleCode === "SUPER_ADMIN" || roleCode === "OPERATIONAL_ADMIN") {
        finalInclude = include;
      } else {
        // Filter: services linked to user's locations
        finalInclude = include.map((inc) => {
          if (inc.as === "locations") {
            return {
              ...inc,
              where: { id: { [Op.in]: locationIds } },
              required: true,
            };
          }
          return inc;
        });
      }

      const { count: totalCount, rows: service } = await masterService.findAndCountAll({
        where: whereClause,
        include: finalInclude,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
        distinct: true,
        limit,
        offset,
      });

      const totalActiveItem = await masterService.count({
        where: { ...whereClause, isActive: true },
        include: finalInclude,
        distinct: true,
      });

      const totalVerifiedItem = await masterService.count({
        where: { ...whereClause, isVerified: true },
        include: finalInclude,
        distinct: true,
      });

      return {
        status: true,
        message: "Success",
        totalCount,
        stats: {
          totalActiveItem,
          totalVerifiedItem
        },
        data: service.map((s) => {
          const plain = s.get({ plain: true });
          // Sort primary images first in nested locations
          if (plain.locations) {
            plain.locations = plain.locations.map(loc => {
              if (loc.images) loc.images = sortPrimaryFirst(loc.images);
              return loc;
            });
          }
          return {
            ...mapServiceWithBackwardCompat(plain),
            statusVerification: plain.verificationStatus?.status || null,
            noteVerification: plain.verificationStatus?.note || null,
          };
        }),
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Toggle isActive for a specific service-location pivot entry
   */
  async toggleLocationActive(serviceId, locationId) {
    try {
      const pivot = await relationshipServiceLocation.findOne({
        where: { serviceId, locationId },
      });

      if (!pivot) {
        return {
          status: false,
          message: "Service tidak terdaftar di lokasi ini",
          data: null,
        };
      }

      pivot.isActive = !pivot.isActive;
      await pivot.save();

      return {
        status: true,
        message: `Service di lokasi ini sekarang ${pivot.isActive ? "aktif" : "non-aktif"}`,
        data: pivot,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
