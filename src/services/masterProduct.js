const {
  masterProduct,
  masterProductCategory,
  masterConsultationCategory,
  relationshipProductCategory,
  relationshipProductConsultationCategory,
  masterGroupProduct,
  masterProductImage,
  customerFavorites,
} = require("../models");

const fs = require("fs");
const path = require("path");

const { Op, Sequelize } = require("sequelize");

module.exports = {
  async getAll(filters = {}) {
    try {
      const { minPrice, maxPrice, categoryIds } = filters;
      const where = { isActive: true };

      if (minPrice !== undefined || maxPrice !== undefined) {
        where[Op.and] = Sequelize.literal(
          `(price - (price * discountPercent / 100)) BETWEEN ${
            minPrice || 0
          } AND ${maxPrice || 9999999}`
        );
      }

      const include = [
        {
          model: masterProductCategory,
          as: "categories",
          through: { attributes: [] },
          where: categoryIds ? { id: { [Op.in]: categoryIds } } : undefined,
          required: !!categoryIds,
        },
        {
          model: masterConsultationCategory,
          as: "consultationCategories",
          through: { attributes: [] },
        },
        {
          model: masterGroupProduct,
          as: "groupProduct",
          through: { attributes: [] },
        },
        {
          model: masterProductImage,
          as: "images",
        },
      ];

      const products = await masterProduct.findAll({
        where,
        include,
        order: [["name", "ASC"]],
      });

      return { status: true, message: "Success", data: products };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getById(id) {
    try {
      const product = await masterProduct.findByPk(id, {
        include: [
          {
            model: masterProductCategory,
            as: "categories",
            through: { attributes: [] },
          },
          {
            model: masterConsultationCategory,
            as: "consultationCategories",
            through: { attributes: [] },
          },
          {
            model: masterGroupProduct,
            as: "groupProduct",
            through: { attributes: [] },
          },
          {
            model: masterProductImage,
            as: "images",
          },
        ],
      });

      if (!product) {
        return { status: false, message: "Product not found", data: null };
      }

      return { status: true, message: "Success", data: product };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async create(data, files) {
    try {
      if (!data.name || data.name.trim() === "") {
        return { status: false, message: "Name is required", data: null };
      }

      let sku = data.sku;
      if (!sku) {
        const lastProduct = await masterProduct.findOne({
          order: [["sku", "DESC"]],
        });

        let lastNumber = 0;

        if (lastProduct?.sku) {
          lastNumber = parseInt(lastProduct.sku.replace("PRD-", ""), 10) || 0;
        }

        const newNumber = lastNumber + 1;
        sku = `PRD-${String(newNumber).padStart(3, "0")}`;
      } else {
        const existing = await masterProduct.findOne({ where: { sku } });
        if (existing) {
          return { status: false, message: "SKU already exists", data: null };
        }
      }

      const newProduct = await masterProduct.create({
        name: data.name,
        sku: sku,
        description: data.description || null,
        price: data.price !== undefined ? data.price : 0.0,
        discountPercent: data.discount !== undefined ? data.discount : 0.0,
        isPrescriptionRequired:
          data.isPrescriptionRequired !== undefined
            ? data.isPrescriptionRequired
            : false,
        isActive: data.isActive !== undefined ? data.isActive : true,
        function: data.function || null,
        compotition: data.compotition || null,
        dose: data.dose || null,
        rulesOfUse: data.rulesOfUse || null,
        attention: data.attention || null,
        packaging: data.packaging || null,
      });

      if (files && files.length > 0) {
        for (const file of files) {
          await masterProductImage.create({
            productId: newProduct.id,
            imageUrl: file.path,
          });
        }
      }

      if (data.categoryIds && Array.isArray(data.categoryIds)) {
        await newProduct.setCategories(data.categoryIds);
      }

      if (data.groupProductIds && Array.isArray(data.groupProductIds)) {
        await newProduct.setGroupProduct(data.groupProductIds);
      }

      if (
        data.consultationCategoryIds &&
        Array.isArray(data.consultationCategoryIds)
      ) {
        await newProduct.setConsultationCategories(
          data.consultationCategoryIds
        );
      }

      return {
        status: true,
        message: "Product created successfully",
        data: newProduct,
      };
    } catch (error) {
      console.error("CREATE ERROR:", error.errors || error);
      return { status: false, message: error.message, data: null };
    }
  },

  async update(id, data, files) {
    try {
      const product = await masterProduct.findByPk(id);
      if (!product) {
        return { status: false, message: "Product not found", data: null };
      }

      if (data.name && data.name.trim() === "") {
        return { status: false, message: "Name cannot be empty", data: null };
      }

      product.name = data.name !== undefined ? data.name : product.name;
      product.description =
        data.description !== undefined ? data.description : product.description;
      product.price = data.price !== undefined ? data.price : product.price;
      product.discountPercent =
        data.discount !== undefined ? data.discount : product.discountPercent;
      product.isPrescriptionRequired =
        data.isPrescriptionRequired !== undefined
          ? data.isPrescriptionRequired
          : product.isPrescriptionRequired;
      product.isActive =
        data.isActive !== undefined ? data.isActive : product.isActive;

      product.function =
        data.function !== undefined ? data.function : product.function;

      product.compotition =
        data.compotition !== undefined ? data.compotition : product.compotition;

      product.dose = data.dose !== undefined ? data.dose : product.dose;

      product.rulesOfUse =
        data.rulesOfUse !== undefined ? data.rulesOfUse : product.rulesOfUse;

      product.attention =
        data.attention !== undefined ? data.attention : product.attention;

      product.packaging =
        data.packaging !== undefined ? data.packaging : product.packaging;

      await product.save();

      if (data.categoryIds && Array.isArray(data.categoryIds)) {
        await product.setCategories(data.categoryIds);
      }

      if (data.groupProductIds && Array.isArray(data.groupProductIds)) {
        await product.setGroupProduct(data.groupProductIds);
      }

      if (
        data.consultationCategoryIds &&
        Array.isArray(data.consultationCategoryIds)
      ) {
        await product.setConsultationCategories(data.consultationCategoryIds);
      }

      if (files && files.length > 0) {
        for (const file of files) {
          await masterProductImage.create({
            productId: id,
            imageUrl: file.path,
          });
        }
      }

      return {
        status: true,
        message: "Product updated successfully",
        data: product,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async deleteImage(imageId) {
    try {
      const image = await masterProductImage.findByPk(imageId);

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
  },

  async getAllByCustomer(filters = {}, customerId = null) {
    try {
      const { minPrice, maxPrice, categoryIds } = filters;

      const where = { isActive: true };

      if (minPrice !== undefined || maxPrice !== undefined) {
        where[Op.and] = Sequelize.literal(
          `(price - (price * discountPercent / 100)) BETWEEN ${
            minPrice || 0
          } AND ${maxPrice || 9999999}`
        );
      }

      const include = [
        {
          model: masterProductCategory,
          as: "categories",
          through: { attributes: [] },
          where: categoryIds ? { id: { [Op.in]: categoryIds } } : undefined,
          required: !!categoryIds,
        },
        {
          model: masterConsultationCategory,
          as: "consultationCategories",
          through: { attributes: [] },
        },
        {
          model: masterGroupProduct,
          as: "groupProduct",
          through: { attributes: [] },
        },
        {
          model: masterProductImage,
          as: "images",
        },
      ];

      // ➕ Jika ada customerId → tambahkan relasi favorites
      if (customerId) {
        include.push({
          model: customerFavorites,
          as: "favorites",
          attributes: ["id"],
          where: {
            customerId,
            favoriteType: "product",
          },
          required: false,
        });
      }

      const products = await masterProduct.findAll({
        where,
        include,
        order: [["name", "ASC"]],
      });

      const result = products.map((prod) => {
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
  async getByIdCustomer(id, customerId = null) {
    try {
      const include = [
        {
          model: masterProductCategory,
          as: "categories",
          through: { attributes: [] },
        },
        {
          model: masterConsultationCategory,
          as: "consultationCategories",
          through: { attributes: [] },
        },
        {
          model: masterGroupProduct,
          as: "groupProduct",
          through: { attributes: [] },
        },
        {
          model: masterProductImage,
          as: "images",
        },
      ];

      if (customerId) {
        include.push({
          model: customerFavorites,
          as: "favorites",
          attributes: ["id"],
          where: {
            customerId,
            favoriteType: "product",
          },
          required: false,
        });
      }

      const product = await masterProduct.findByPk(id, {
        include,
      });

      if (!product) {
        return { status: false, message: "Product not found", data: null };
      }

      const plain = product.get({ plain: true });

      return {
        status: true,
        message: "Success",
        data: {
          ...plain,
          isFavorite: plain.favorites.length > 0 || false,
          favorites: undefined,
        },
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
