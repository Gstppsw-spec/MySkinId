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
  relationshipUserCompany,
  relationshipProductLocation,
  flashSale,
  flashSaleItem,
  requestVerification,
} = require("../models");
const fs = require("fs");
const flashSaleService = require("./flashSale.service");
const { Op, Sequelize } = require("sequelize");
const { sortPrimaryFirst, sortPrimaryImages } = require("../helpers/sortPrimaryImage");

/**
 * Helper: map product rows to add backward-compat locationId + location fields
 */
function mapProductWithBackwardCompat(plain, customerId) {
  // backward compat: pick first active location
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
        where.isVerified = true;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where[Op.and] = Sequelize.literal(`
        (price - (price * discountPercent / 100))
        BETWEEN ${minPrice || 0} AND ${maxPrice || 9999999}
      `);
      }

      // Distance literal uses the first joined location
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

      // Build location where for cityId / distance filter
      const locationWhere = {};
      if (cityId) locationWhere.cityId = cityId;
      if (distanceLiteral && maxDistance) {
        locationWhere[Op.and] = Sequelize.where(distanceLiteral, {
          [Op.lte]: maxDistance,
        });
      }

      // Pivot through config
      const throughConfig = {
        attributes: ["isActive"],
      };
      if (isCustomer == 1 || isCustomer == "1") {
        throughConfig.where = { isActive: true };
      }

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
          attributes: ["id", "imageUrl", "isPrimary"],
        },
        {
          model: masterLocation,
          as: "locations",
          through: throughConfig,
          where: Object.keys(locationWhere).length > 0 ? locationWhere : undefined,
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

      let order = [["name", "ASC"], ["id", "ASC"]];

      if (sortBy === "distance" && distanceLiteral) {
        order = [[distanceLiteral, "ASC"], ["id", "ASC"]];
      }

      if (sortBy === "low-price") {
        order = [
          [
            Sequelize.literal("(price - (price * discountPercent / 100))"),
            "ASC",
          ],
          ["id", "ASC"],
        ];
      }

      if (sortBy === "high-price") {
        order = [
          [
            Sequelize.literal("(price - (price * discountPercent / 100))"),
            "DESC",
          ],
          ["id", "ASC"],
        ];
      }

      if (sortBy === "rating") {
        order = [["ratingAvg", "DESC"], ["id", "ASC"]];
      }

      if (!sortBy || sortBy === "recommendation") {
        order = [];
        if (distanceLiteral) {
          order.push([distanceLiteral, "ASC"]);
        }
        order.push(["ratingAvg", "DESC"]);
        order.push(["name", "ASC"]);
        order.push(["id", "ASC"]);
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

      const result = products.flatMap((prod) => {
        const plain = prod.get({ plain: true });
        if (plain.images) plain.images = sortPrimaryFirst(plain.images);

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

        const lightPlain = {
          ...plain,
          description: undefined,
          function: undefined,
          compotition: undefined,
          dose: undefined,
          rulesOfUse: undefined,
          attention: undefined,
          lengthCm: undefined,
          widthCm: undefined,
          heightCm: undefined,
          categories: undefined,
          groupProduct: undefined,
        };

        if (lightPlain.locations && lightPlain.locations.length > 0) {
          return lightPlain.locations.map(loc => {
            return {
              ...lightPlain,
              biteshipId: loc.biteshipAreaId || null,
              isFlashSale,
              flashSale: flashSaleInfo,
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
          ...lightPlain,
          biteshipId: null,
          isFlashSale,
          flashSale: flashSaleInfo,
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
              cos(radians(CAST(\`locations\`.latitude AS FLOAT))) *
              cos(radians(CAST(\`locations\`.longitude AS FLOAT)) - radians(${userLng})) +
              sin(radians(${userLat})) *
              sin(radians(CAST(\`locations\`.latitude AS FLOAT)))
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
          attributes: ["id", "imageUrl", "isPrimary"],
        },
        {
          model: masterLocation,
          as: "locations",
          through: { attributes: ["isActive"] },
          attributes: [
            "id",
            "name",
            "latitude",
            "district",
            "longitude",
            "cityId",
            "districtId",
            "biteshipAreaId",
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
      if (plain.images) plain.images = sortPrimaryFirst(plain.images);

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

      const mapped = mapProductWithBackwardCompat(plain, customerId);
      return {
        status: true,
        message: "Success",
        data: {
          ...mapped,
          biteshipId: mapped.location?.biteshipAreaId || null,
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
      // Normalize array inputs (handle keys with [] suffix)
      const locationIds = data.locationIds || data["locationIds[]"];
      const categoryIds = data.categoryIds || data["categoryIds[]"];
      const groupProductIds = data.groupProductIds || data["groupProductIds[]"];
      const consultationCategoryIds = data.consultationCategoryIds || data["consultationCategoryIds[]"];

      if (!data.name || data.name.trim() === "") {
        return { status: false, message: "Name is required", data: null };
      }

      let sku = data.sku;
      if (!sku) {
        const lastProduct = await masterProduct.findOne({
          order: [["sku", "DESC"]],
          paranoid: false,
        });

        let lastNumber = 0;

        if (lastProduct?.sku) {
          lastNumber = parseInt(lastProduct.sku.replace("PRD-", ""), 10) || 0;
        }

        const newNumber = lastNumber + 1;
        sku = `PRD-${String(newNumber).padStart(3, "0")}`;
      } else {
        const existing = await masterProduct.findOne({
          where: { sku },
          paranoid: false,
        });
        if (existing) {
          if (existing.deletedAt) {
            // Restore and reuse
            await existing.restore();
            console.log(`[Product Create] Restored soft-deleted product with SKU: ${sku}`);

            // Redirect to update logic (or just update here)
            // For now, we update it in place since we're in the create flow
            const updateProps = {
              name: data.name,
              description: data.description || existing.description,
              isAvailable: data.isAvailable ?? existing.isAvailable,
              price: data.price ? Number(data.price) : existing.price,
              discountPercent: data.discountPercent !== undefined ? Number(data.discountPercent) : existing.discountPercent,
              isVerified: false, // Reset verification on significant recreation?
            };
            await existing.update(updateProps);

            // Re-assign associations (locations, categories, etc.)
            if (locationIds && Array.isArray(locationIds)) {
              await existing.setLocations(locationIds);
            }
            if (categoryIds && Array.isArray(categoryIds)) {
              await existing.setCategories(categoryIds);
            }

            return {
              status: true,
              message: "Product restored and updated successfully",
              data: existing,
            };
          }
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
        weightGram: data.weightGram || null,
        lengthCm: data.lengthCm || null,
        widthCm: data.widthCm || null,
        heightCm: data.heightCm || null,
        createdBy: userId,
      });

      // Many-to-many: assign locations
      if (locationIds && Array.isArray(locationIds)) {
        await newProduct.setLocations(locationIds);
      }

      if (files && files.length > 0) {
        const primaryIndex = data.primaryImageIndex !== undefined ? Number(data.primaryImageIndex) : 0;
        for (let i = 0; i < files.length; i++) {
          await masterProductImage.create({
            productId: newProduct.id,
            imageUrl: files[i].path,
            isPrimary: i === primaryIndex,
          });
        }
      }

      if (categoryIds && Array.isArray(categoryIds)) {
        await newProduct.setCategories(categoryIds);
      }

      if (groupProductIds && Array.isArray(groupProductIds)) {
        await newProduct.setGroupProduct(groupProductIds);
      }

      if (consultationCategoryIds && Array.isArray(consultationCategoryIds)) {
        await newProduct.setConsultationCategories(consultationCategoryIds);
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

      if (product.isVerified) {
        product.price = data.price !== undefined ? data.price : product.price;
        product.discountPercent =
          data.discount !== undefined ? data.discount : product.discountPercent;
        product.isActive =
          data.isActive !== undefined ? data.isActive : product.isActive;

        await product.save();

        if (data.locationIds && Array.isArray(data.locationIds)) {
          await product.setLocations(data.locationIds);
        }

        if (data.categoryIds && Array.isArray(data.categoryIds)) {
          await product.setCategories(data.categoryIds);
        }

        // Allow adding images even if verified
        if (files && files.length > 0) {
          for (const file of files) {
            await masterProductImage.create({
              productId: id,
              imageUrl: file.path,
              isPrimary: false,
            });
          }
        }

        if (data.primaryImageId) {
          await this.setPrimaryImage(data.primaryImageId);
        }

        return {
          status: true,
          message:
            "Produk sudah diverifikasi. Harga, diskon, status aktif, lokasi, kategori, dan gambar telah diperbarui.",
          data: product,
        };
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

      // Many-to-many: update locations
      if (data.locationIds && Array.isArray(data.locationIds)) {
        await product.setLocations(data.locationIds);
      }

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
            isPrimary: false, // Default false for new images in update
          });
        }
      }

      if (data.primaryImageId) {
        await this.setPrimaryImage(data.primaryImageId);
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
      const where = {
        isActive: true,
        isVerified: true
      };

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
          attributes: ["id", "imageUrl", "isPrimary"],
        },
        {
          model: masterLocation,
          as: "locations",
          where: { id: locationId },
          through: {
            attributes: ["isActive"],
            ...(isCustomer == 1 || isCustomer == "1" ? { where: { isActive: true } } : {}),
          },
          attributes: ["id", "name", "latitude", "longitude", "cityId", "districtId", "biteshipAreaId"],
          include: [
            {
              model: masterLocationImage,
              as: "images",
              attributes: ["id", "imageUrl"],
              limit: 1,
              separate: true,
            },
          ],
          required: true,
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
        if (plain.images) plain.images = sortPrimaryFirst(plain.images);

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

        const lightPlain = {
          ...plain,
          description: undefined,
          function: undefined,
          compotition: undefined,
          dose: undefined,
          rulesOfUse: undefined,
          attention: undefined,
          lengthCm: undefined,
          widthCm: undefined,
          heightCm: undefined,
          categories: undefined,
          groupProduct: undefined,
        };

        const mapped = mapProductWithBackwardCompat(lightPlain, customerId);
        return {
          ...mapped,
          biteshipId: mapped.location?.biteshipAreaId || null,
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

  async getProductByUser({ id: userId, roleCode, locationIds }, filters = {}, pagination = {}) {
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

      const { name, locationId } = filters;
      const { limit, offset } = pagination;

      // Authorization check for locationId filter
      if (locationId && roleCode !== "SUPER_ADMIN" && roleCode !== "OPERATIONAL_ADMIN") {
        if (!locationIds.includes(locationId)) {
          return { status: false, message: "Location not allowed or not found for this user" };
        }
      }

      const whereClause = {};
      if (name) {
        whereClause.name = { [Op.like]: `%${name}%` };
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
          attributes: ["id", "imageUrl", "isPrimary"],
        },
        {
          model: masterLocation,
          as: "locations",
          through: { attributes: ["isActive"] },
          attributes: ["id", "name", "cityId", "districtId"],
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
        if (locationId) {
          finalInclude = include.map((inc) => {
            if (inc.as === "locations") {
              return {
                ...inc,
                where: { id: locationId },
                required: true,
              };
            }
            return inc;
          });
        } else {
          finalInclude = include;
        }
      } else {
        // Filter: products linked to allowed locationIds (further restricted if locationId filter provided)
        const targetIds = locationId ? [locationId] : locationIds;
        finalInclude = include.map((inc) => {
          if (inc.as === "locations") {
            return {
              ...inc,
              where: { id: { [Op.in]: targetIds } },
              required: true,
            };
          }
          return inc;
        });
      }

      const { count: totalCount, rows: products } = await masterProduct.findAndCountAll({
        where: whereClause,
        include: finalInclude,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
        distinct: true,
        limit,
        offset,
        order: [["id", "ASC"]],
      });

      const totalActiveItem = await masterProduct.count({
        where: { ...whereClause, isActive: true },
        include: finalInclude,
        distinct: true,
      });

      const totalVerifiedItem = await masterProduct.count({
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
        data: products.map((p) => {
          const plain = p.get({ plain: true });
          if (plain.images) plain.images = sortPrimaryFirst(plain.images);
          return {
            ...mapProductWithBackwardCompat(plain),
            statusVerification: plain.verificationStatus?.status || null,
            noteVerification: plain.verificationStatus?.note || null,
          };
        }),
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
          attributes: ["id", "imageUrl", "isPrimary"],
        },
        {
          model: masterLocation,
          as: "locations",
          through: { attributes: ["isActive"] },
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
        data: products.map((p) => {
          const plain = p.get({ plain: true });
          if (plain.images) plain.images = sortPrimaryFirst(plain.images);
          return mapProductWithBackwardCompat(plain);
        }),
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Toggle isActive for a specific product-location pivot entry
   */
  async toggleLocationActive(productId, locationId) {
    try {
      const pivot = await relationshipProductLocation.findOne({
        where: { productId, locationId },
      });

      if (!pivot) {
        return {
          status: false,
          message: "Product tidak terdaftar di lokasi ini",
          data: null,
        };
      }

      pivot.isActive = !pivot.isActive;
      await pivot.save();

      return {
        status: true,
        message: `Product di lokasi ini sekarang ${pivot.isActive ? "aktif" : "non-aktif"}`,
        data: pivot,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async deleteProduct(id) {
    try {
      const product = await masterProduct.findByPk(id);

      if (!product) {
        return {
          status: false,
          message: "Product not found",
          data: null,
        };
      }

      if (product.isVerified) {
        return {
          status: false,
          message: "Product sudah diverifikasi dan tidak dapat dihapus",
          data: null,
        };
      }

      await product.destroy(); // Soft delete because of paranoid true

      return {
        status: true,
        message: "Product deleted successfully",
        data: null,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  async setPrimaryImage(imageId) {
    try {
      const selectedImage = await masterProductImage.findByPk(imageId);
      if (!selectedImage) {
        return { status: false, message: "Image tidak ditemukan" };
      }

      // Reset all images for this product to false
      await masterProductImage.update(
        { isPrimary: false },
        { where: { productId: selectedImage.productId } }
      );

      // Set selected image to true
      selectedImage.isPrimary = true;
      await selectedImage.save();

      return {
        status: true,
        message: "Berhasil mengubah gambar utama",
        data: selectedImage,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
};
