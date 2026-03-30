const { log } = require("console");
const {
  masterProduct,
  masterProductCategory,
  masterConsultationCategory,
  masterGroupProduct,
  masterProductImage,
  customerFavorites,
  masterLocation,
  masterLocationImage,
  relationshipUserLocation,
  flashSale,
  flashSaleItem,
} = require("../models");
const fs = require("fs");
const flashSaleService = require("./flashSale.service");
const { Op, Sequelize } = require("sequelize");

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
        sort,
        customerId,
        isCustomer,
        cityId,
        consultationCategoryIds
      } = filters;

      const { limit, offset } = pagination;

      const where = {};

      if (name) {
        where.name = { [Op.like]: `%${name}%` };
      }

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
          model: masterProductCategory,
          as: "categories",
          through: { attributes: [] },
          where: categoryIds ? { id: { [Op.in]: categoryIds } } : undefined,
          required: !!categoryIds,
          attributes: ["id", "name", "description"],
        },
        {
          model: masterConsultationCategory,
          as: "consultationCategories",
          through: { attributes: [] },
          where: consultationCategoryIds ? { id: { [Op.in]: consultationCategoryIds } } : undefined,
          required: !!consultationCategoryIds,
          attributes: ["id", "name", "description"],
        },
        {
          model: masterGroupProduct,
          as: "groupProduct",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterProductImage,
          as: "images",
          separate: true,
          attributes: ["id", "imageUrl"],
        },
        {
          model: masterLocation,
          as: "location",
          where: (cityId || (userLat && userLng && maxDistance))
            ? {
              ...(cityId ? { cityId } : {}),
              ...(distanceLiteral && maxDistance
                ? {
                  [Op.and]: Sequelize.where(distanceLiteral, {
                    [Op.lte]: maxDistance,
                  }),
                }
                : {}),
            }
            : undefined,
          attributes: [
            "id",
            "name",
            "latitude",
            "longitude",
            "cityId",
            "districtId",
            "biteshipAreaId",
            ...(distanceLiteral ? [[distanceLiteral, "distance"]] : []),
          ],
          required: !!(userLat && userLng || cityId),
        },
      ];

      let order = [["name", "ASC"]];

      if (sort === "distance" && distanceLiteral) {
        order = [[distanceLiteral, "ASC"]];
      }

      if (sort === "low-price") {
        order = [
          [
            Sequelize.literal("(price - (price * discountPercent / 100))"),
            "ASC",
          ],
        ];
      }

      if (sort === "high-price") {
        order = [
          [
            Sequelize.literal("(price - (price * discountPercent / 100))"),
            "DESC",
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
            favoriteType: "product",
          },
          required: false,
        });
      }

      const { count, rows: products } = await masterProduct.findAndCountAll({
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

      if (!products) {
        return { status: false, message: "Product not found", data: null };
      }

      await flashSaleService.syncStatuses();
      const activeFlashSales = await flashSale.findAll({
        where: { status: "ACTIVE" },
        include: [
          {
            model: flashSaleItem,
            as: "items",
            where: { itemType: "PRODUCT" },
          },
        ],
      });

      const result = products.map((prod) => {
        const plain = prod.get({ plain: true });

        let flashSaleInfo = null;
        let isFlashSale = false;

        for (const fs of activeFlashSales) {
          const item = fs.items.find((i) => i.productId === plain.id);
          if (item) {
            isFlashSale = true;
            flashSaleInfo = {
              flashPrice: item.flashPrice,
              flashSaleId: fs.id,
              flashSaleItemId: item.id,
              titleFlashSale: fs.title,
              quota: item.quota,
              sold: item.sold,
              endDateFlashSale: fs.endDate,
            };
            break;
          }
        }

        return {
          ...plain,
          isFlashSale,
          flashSale: flashSaleInfo,
          isFavorite: customerId
            ? plain.favorites && plain.favorites.length > 0
            : false,
          favorites: undefined,
        };
      });

      return {
        status: true,
        message: "Success",
        data: result,
        totalCount: count,
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
        data: null,
      };
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
          model: masterProductCategory,
          as: "categories",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterConsultationCategory,
          as: "consultationCategories",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterGroupProduct,
          as: "groupProduct",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterProductImage,
          as: "images",
          attributes: ["id", "imageUrl"],
        },
        {
          model: masterLocation,
          as: "location",
          attributes: [
            "id",
            "name",
            "latitude",
            "district",
            "longitude",
            "cityId",
            "districtId",
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
          required: !!(userLat && userLng),
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

      // Flash Sale Integration
      await flashSaleService.syncStatuses();
      const activeFlashSales = await flashSale.findAll({
        where: { status: "ACTIVE" },
        include: [
          {
            model: flashSaleItem,
            as: "items",
            where: { itemType: "PRODUCT", productId: id },
          },
        ],
      });

      let flashSaleInfo = null;
      let isFlashSale = false;

      if (activeFlashSales.length > 0) {
        const fs = activeFlashSales[0];
        const item = fs.items[0];
        isFlashSale = true;
        flashSaleInfo = {
          flashPrice: item.flashPrice,
          flashSaleId: fs.id,
          flashSaleItemId: item.id,
          titleFlashSale: fs.title,
          quota: item.quota,
          sold: item.sold,
          endDateFlashSale: fs.endDate,
        };
      }

      return {
        status: true,
        message: "Success",
        data: {
          ...plain,
          isFlashSale,
          flashSale: flashSaleInfo,
          isFavorite: plain.favorites?.length > 0 || false,
          favorites: undefined,
        },
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async create(data, files, userId) {
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
        locationId: data.locationId || null,
        weightGram: data.weightGram || null,
        lengthCm: data.lengthCm || null,
        widthCm: data.widthCm || null,
        heightCm: data.heightCm || null,
        createdBy: userId,
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
          data.consultationCategoryIds,
        );
      }

      return {
        status: true,
        message: "Product created successfully",
        data: newProduct,
      };
    } catch (error) {
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

      product.locationId =
        data.locationId !== undefined ? data.locationId : product.locationId;

      product.weightGram =
        data.weightGram !== undefined
          ? Number(data.weightGram)
          : product.weightGram;

      product.lengthCm =
        data.lengthCm !== undefined ? Number(data.lengthCm) : product.lengthCm;

      product.widthCm =
        data.widthCm !== undefined ? Number(data.widthCm) : product.widthCm;

      product.heightCm =
        data.heightCm !== undefined ? Number(data.heightCm) : product.heightCm;

      product.createdBy =
        data.createdBy !== undefined ? data.createdBy : product.createdBy;

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

  async getByLocationId(customerId, locationId, isCustomer) {
    try {
      const where = {};

      if (isCustomer == 1 || isCustomer == "1") {
        where.isActive = true;
      }

      where.locationId = locationId;

      const include = [
        {
          model: masterProductCategory,
          as: "categories",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterConsultationCategory,
          as: "consultationCategories",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterGroupProduct,
          as: "groupProduct",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterProductImage,
          as: "images",
          attributes: ["id", "imageUrl"],
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
      const products = await masterProduct.findAll({
        where,
        include,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
        order: [["name", "ASC"]],
      });

      if (!products) {
        return { status: false, message: "Product not found", data: null };
      }

      await flashSaleService.syncStatuses();
      const activeFlashSales = await flashSale.findAll({
        where: { status: "ACTIVE" },
        include: [
          {
            model: flashSaleItem,
            as: "items",
            where: { itemType: "PRODUCT" },
          },
        ],
      });

      const result = products.map((prod) => {
        const plain = prod.get({ plain: true });

        let flashSaleInfo = null;
        let isFlashSale = false;

        for (const fs of activeFlashSales) {
          const item = fs.items.find((i) => i.productId === plain.id);
          if (item) {
            isFlashSale = true;
            flashSaleInfo = {
              flashPrice: item.flashPrice,
              flashSaleId: fs.id,
              flashSaleItemId: item.id,
              titleFlashSale: fs.title,
              quota: item.quota,
              sold: item.sold,
              endDateFlashSale: fs.endDate,
            };
            break;
          }
        }

        return {
          ...plain,
          isFlashSale,
          flashSale: flashSaleInfo,
          isFavorite: customerId
            ? plain.favorites && plain.favorites.length > 0
            : false,
          favorites: undefined,
        };
      });

      return {
        status: true,
        message: "Success",
        data: result,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async getProductByUser({ id: userId, roleCode, locationIds }) {
    try {
      if (!locationIds || locationIds.length === 0) {
        locationIds = await relationshipUserLocation
          .findAll({
            where: { userId },
            attributes: ["locationId"],
            raw: true,
          })
          .then((res) => res.map((r) => r.locationId));
      }

      const include = [
        {
          model: masterProductCategory,
          as: "categories",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterConsultationCategory,
          as: "consultationCategories",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterGroupProduct,
          as: "groupProduct",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterProductImage,
          as: "images",
          attributes: ["id", "imageUrl"],
        },
        {
          model: masterLocation,
          as: "location",
          attributes: ["id", "name", "cityId", "districtId"],
        },
      ];

      if (roleCode === "SUPER_ADMIN") {
        const product = await masterProduct.findAll({
          include,
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
        });

        return {
          status: true,
          message: "Success",
          data: product,
        };
      }

      const product = await masterProduct.findAll({
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
        data: product,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getProductByCreator(userId) {
    try {
      const include = [
        {
          model: masterProductCategory,
          as: "categories",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterConsultationCategory,
          as: "consultationCategories",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterGroupProduct,
          as: "groupProduct",
          through: { attributes: [] },
          attributes: ["id", "name", "description"],
        },
        {
          model: masterProductImage,
          as: "images",
          attributes: ["id", "imageUrl"],
        },
        {
          model: masterLocation,
          as: "location",
          attributes: ["id", "name", "cityId", "districtId"],
        },
      ];

      const products = await masterProduct.findAll({
        where: { createdBy: userId },
        include,
        attributes: {
          exclude: ["updatedAt"],
        },
        order: [["createdAt", "DESC"]],
      });

      return {
        status: true,
        message: "Success",
        data: products,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
};
