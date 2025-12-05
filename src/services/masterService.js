const {
  masterService,
  masterSubCategoryService,
  masterLocation,
} = require("../models");

const { Op, Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");

async function deleteOldFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("Old image deleted:", filePath);
    }
  } catch (err) {
    console.error("Failed to delete old image:", err.message);
  }
}

module.exports = {
  async getAll(filters = {}) {
    try {
      const { minPrice, maxPrice, categoryIds } = filters;
      const where = { isActive: true };

      if (minPrice !== undefined || maxPrice !== undefined) {
        where[Op.and] = Sequelize.literal(
          `finalPrice BETWEEN ${minPrice || 0} AND ${maxPrice || 9999999}`
        );
      }

      const include = [
        {
          model: masterSubCategoryService,
          as: "categories",
          through: { attributes: [] },
          where: categoryIds ? { id: { [Op.in]: categoryIds } } : undefined,
          required: !!categoryIds,
        },
        {
          model: masterLocation,
          as: "location",
        },
      ];

      const service = await masterService.findAll({
        where,
        include,
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
          // {
          //   model: masterSubCategoryService,
          //   as: "categories",
          //   through: { attributes: [] },
          //   where: categoryIds ? { id: { [Op.in]: categoryIds } } : undefined,
          //   required: !!categoryIds,
          // },
          {
            model: masterLocation,
            as: "location",
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

  async create(data, file) {
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
        normalPrice,
        discountPercent = 0,
        discountValue = 0,
        isActive = true,
        categoryIds,
      } = data;

      if (!name || name.trim() === "") {
        return { status: false, message: "Name is required", data: null };
      }

      if (!locationId) {
        return { status: false, message: "Location is required", data: null };
      }

      if (!normalPrice) {
        return {
          status: false,
          message: "Normal price is required",
          data: null,
        };
      }

      // Hitung final price
      let finalPrice = Number(normalPrice);

      if (discountPercent > 0) {
        finalPrice = normalPrice - normalPrice * (discountPercent / 100);
      }

      if (discountValue > 0) {
        finalPrice = normalPrice - discountValue;
      }

      // Handle single image
      let imageUrl = null;
      if (file) {
        imageUrl = file.path; // <-- simpan path image
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
        normalPrice,
        discountPercent,
        discountValue,
        finalPrice,
        imageUrl,
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
      console.error("Create Service Error:", error);
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },

  async update(id, data, file) {
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
        normalPrice,
        discountPercent = 0,
        discountValue = 0,
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

      // Hitung final price jika normalPrice / discount diupdate
      let finalPrice = service.finalPrice;

      const np = Number(normalPrice ?? service.normalPrice);
      const dp = Number(discountPercent ?? service.discountPercent);
      const dv = Number(discountValue ?? service.discountValue);

      finalPrice = np;

      if (dp > 0) {
        finalPrice = np - np * (dp / 100);
      }

      if (dv > 0) {
        finalPrice = np - dv;
      }

      // Handle update image
      let imageUrl = service.imageUrl;
      if (file) {
        await deleteOldFile(service.imageUrl);
        imageUrl = file.path; // replace gambar lama
      }

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
        normalPrice: np,
        discountPercent: dp,
        discountValue: dv,
        finalPrice,
        imageUrl,
        isActive,
      });

      // Update categories jika dikirim
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
};
