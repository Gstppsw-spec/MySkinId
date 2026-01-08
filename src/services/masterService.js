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
      const { minPrice, maxPrice, categoryIds } = filters;
      const where = { isActive: true };

      if (minPrice !== undefined || maxPrice !== undefined) {
        where[Op.and] = Sequelize.literal(
          `price BETWEEN ${minPrice || 0} AND ${maxPrice || 9999999}`
        );
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
          as: "location",
          attributes: ["id", "name", "address"],
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

      const service = await masterService.findAll({
        where,
        include,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
        order: [["name", "ASC"]],
      });

      return { status: true, message: "Success", data: service };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getById(id) {
    try {
      const service = await masterService.findByPk(id, {
        include: [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "address"],
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
        ],
      });

      if (!service) {
        return { status: false, message: "Product not found", data: null };
      }

      return { status: true, message: "Success", data: service };
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
        return { status: false, message: "Name is required", data: null };
      }

      if (!locationId) {
        return { status: false, message: "Location is required", data: null };
      }

      if (!price) {
        return {
          status: false,
          message: "Normal price is required",
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

  async getByLocationId(locationId) {
    try {
      const service = await masterService.findAll({
        where: { locationId },
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
      return { status: true, message: "Success", data: service };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getAllCustomer(filters = {}, customerId = null) {
    try {
      const { minPrice, maxPrice, categoryIds } = filters;
      const where = { isActive: true };

      if (minPrice !== undefined || maxPrice !== undefined) {
        where[Op.and] = Sequelize.literal(
          `price BETWEEN ${minPrice || 0} AND ${maxPrice || 9999999}`
        );
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
          as: "location",
          attributes: ["id", "name", "address"],
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
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
        order: [["name", "ASC"]],
      });

      if (!service) {
        return { status: false, message: "Product not found", data: null };
      }

      const data = service.map((s) => {
        const plain = s.get({ plain: true });
        return {
          ...plain,
          isFavorite: customerId
            ? plain.favorites && plain.favorites.length > 0
            : false,
          favorites: undefined,
        };
      });

      return { status: true, message: "Success", data };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getByIdCustomer(id, customerId = null) {
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
          attributes: ["id", "name", "address"],
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
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
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

  async getByLocationIdCustomer(locationId, customerId = null) {
    try {
      const include = [
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

      const service = await masterService.findAll({
        where: { locationId },
        include,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
        order: [["name", "ASC"]],
      });

      if (!service) {
        return { status: false, message: "Product not found", data: null };
      }

      const data = service.map((s) => {
        const plain = s.get({ plain: true });
        return {
          ...plain,
          isFavorite: customerId
            ? plain.favorites && plain.favorites.length > 0
            : false,
          favorites: undefined,
        };
      });

      return { status: true, message: "Success", data };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
