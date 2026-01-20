const {
  masterService,
  masterSubCategoryService,
  masterLocation,
  masterLocationImage,
  customerFavorites,
} = require("../models");

const { Op, Sequelize } = require("sequelize");

module.exports = {
  async getAll(filters = {}) {
    try {
      const {
        minPrice,
        maxPrice,
        categoryIds,
        userLat,
        userLng,
        maxDistance,
        sort,
        customerId,
        isCustomer,
      } = filters;

      const where = {};

      if (isCustomer == 1 || isCustomer == "1") {
        where.isActive = true;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where[Op.and] = Sequelize.literal(`
          (price - (price * discountPercent / 100))
          BETWEEN ${minPrice || 0} AND ${maxPrice || 9999999}
        `);
      }

      const distanceLiteral =
        userLat && userLng
          ? Sequelize.literal(`
            6371 * acos(
              cos(radians(${userLat})) *
              cos(radians(CAST(location.latitude AS FLOAT))) *
              cos(radians(CAST(location.longitude AS FLOAT)) - radians(${userLng})) +
              sin(radians(${userLat})) *
              sin(radians(CAST(location.latitude AS FLOAT)))
            )
          `)
          : null;

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
          as: "location",
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

      if (sort === "distance" && distanceLiteral) {
        order = [[distanceLiteral, "ASC"]];
      }

      if (sort === "price") {
        order = [
          [
            Sequelize.literal("(price - (price * discountPercent / 100))"),
            "ASC",
          ],
        ];
      }

      if (sort === "rating") {
        order = [["ratingAvg", "DESC"]];
      }

      if (!sort || sort === "recommendation") {
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

      const service = await masterService.findAll({
        where,
        include,
        order,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
      });

      if (!service) {
        return {
          status: false,
          message: "Layanan tidak ditemukan",
          data: null,
        };
      }

      const result = service.map((prod) => {
        const plain = prod.get({ plain: true });
        return {
          ...plain,
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

  async getById(id, customerId, userLat, userLng) {
    try {
      const distanceLiteral =
        userLat && userLng
          ? Sequelize.literal(`
            6371 * acos(
              cos(radians(${userLat})) *
              cos(radians(CAST(location.latitude AS FLOAT))) *
              cos(radians(CAST(location.longitude AS FLOAT)) - radians(${userLng})) +
              sin(radians(${userLat})) *
              sin(radians(CAST(location.latitude AS FLOAT)))
            )
          `)
          : null;

      const include = [
        {
          model: masterLocation,
          as: "location",
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
        return { status: false, message: "Product not found", data: null };
      }

      const plain = service.get({ plain: true });

      return {
        status: true,
        message: "Success",
        data: {
          ...plain,
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
        locationId,
        price,
        discountPercent = 0,
        isActive = true,
        categoryIds,
      } = data;

      if (!name || name.trim() === "") {
        return {
          status: false,
          message: "Nama tidak boleh kosong",
          data: null,
        };
      }

      if (!locationId) {
        return {
          status: false,
          message: "Lokasi tidak boleh kosong",
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
        locationId,
        price: Number(price),
        discountPercent,
        isActive,
      });

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
        locationId,
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

      // Validasi locationId
      if (locationId) {
        const location = await masterLocation.findByPk(locationId);
        if (!location) {
          return {
            status: false,
            message: "Invalid locationId. Location not found.",
            data: null,
          };
        }
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
        locationId,
        price: np,
        discountPercent: dp,
        isActive,
      });

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

  async getByLocationId(locationId, customerId, isCustomer) {
    try {
      const where = {};
      if (isCustomer == 1 || isCustomer == "1") {
        where.isActive = true;
      }

      where.locationId = locationId;

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
        ],
      });

      if (!service) {
        return { status: false, message: "Service not found", data: null };
      }

      const result = service.map((prod) => {
        const plain = prod.get({ plain: true });
        return {
          ...plain,
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

  async getServiceByUser({ locationIds, roleCode }) {
    try {
      const include = [
        {
          model: masterSubCategoryService,
          as: "categories",
          through: { attributes: [] },
          attributes: ["id", "name"],
        },
        {
          model: masterLocation,
          as: "location",
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
      ];

      if (roleCode === "SUPER_ADMIN") {
        const service = await masterService.findAll({
          include,
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
        });

        return {
          status: true,
          message: "Success",
          data: service,
        };
      }

      const service = await masterService.findAll({
        include,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
        where: {
          locationId: {
            [Op.in]: locationIds,
          },
        },
      });

      return {
        status: true,
        message: "Success",
        data: service,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
};
