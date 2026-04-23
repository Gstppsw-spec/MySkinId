const {
  masterPackage,
  customerFavorites,
  masterLocation,
  masterLocationImage,
  masterPackageItems,
  masterService,
  masterSubCategoryService,
  relationshipUserLocation,
  masterConsultationCategory,
  relationshipPackageLocation,
  relationshipServiceLocation,
  flashSale,
  flashSaleItem,
  requestVerification,
  relationshipUserCompany,
} = require("../models");
const sequelize = require("../models").sequelize;
const flashSaleService = require("./flashSale.service");

const { Op, Sequelize } = require("sequelize");
const { sortPrimaryFirst } = require("../helpers/sortPrimaryImage");

/**
 * Helper: backward compat — add singular location/locationId from locations array
 */
function mapPackageWithBackwardCompat(plain) {
  const firstLoc = plain.locations?.[0] || null;
  return {
    ...plain,
    locationId: firstLoc?.id || null,
    location: firstLoc,
  };
}

module.exports = {
  async getAllPackage(filters = {}, pagination = {}) {
    try {
      const {
        name,
        minPrice,
        maxPrice,
        userLat,
        userLng,
        maxDistance,
        sortBy,
        customerId,
        isCustomer,
        categoryIds,
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
        (\`masterPackage\`.price - (\`masterPackage\`.price * \`masterPackage\`.discountPercent / 100))
        BETWEEN ${minPrice || 0} AND ${maxPrice || 9999999}
      `);
      }

      if (categoryIds) {
        const ids = Array.isArray(categoryIds)
          ? categoryIds
          : categoryIds.toString().split(",").map((id) => id.trim());

        if (ids.length > 0) {
          where[Op.and] = where[Op.and] || [];
          where[Op.and].push(
            Sequelize.literal(`
              EXISTS (
                SELECT 1
                FROM masterPackageItems mpi
                JOIN masterService ms ON mpi.serviceId = ms.id
                JOIN relationshipServiceCategory rsc ON ms.id = rsc.serviceId
                WHERE mpi.packageId = masterPackage.id
                AND rsc.subCategoryServiceId IN (${ids.map(id => `'${id}'`).join(",")})
              )
            `)
          );
        }
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

      // Build location where
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
          model: masterLocation,
          as: "locations",
          through: throughConfig,
          where: Object.keys(locationWhere).length > 0 ? locationWhere : undefined,
          include: [
            {
              model: masterLocationImage,
              as: "images",
              attributes: ["id", "imageUrl"],
              limit: 1,
              separate: true,
            },
          ],
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
        {
          model: masterPackageItems,
          as: "items",
          attributes: ["packageId", "qty", "serviceId", "id"],
          include: [
            {
              model: masterService,
              as: "service",
              attributes: ["id", "name"],
              include: {
                model: masterSubCategoryService,
                as: "categories",
                through: { attributes: [] },
                attributes: ["id", "name"],
              },
            },
          ],
        },
        {
          model: masterConsultationCategory,
          as: "consultationCategories",
          through: { attributes: [] },
          where: consultationCategoryIds ? { id: { [Op.in]: consultationCategoryIds } } : undefined,
          required: !!consultationCategoryIds,
          attributes: ["id", "name", "description"],
        },
      ];

      let order = [["name", "ASC"], ["id", "ASC"]];

      if (sortBy === "distance" && distanceLiteral) {
        order = [[distanceLiteral, "ASC"], ["id", "ASC"]];
      }

      if (sortBy === "low-price") {
        order = [
          [
            Sequelize.literal("(`masterPackage`.price - (`masterPackage`.price * `masterPackage`.discountPercent / 100))"),
            "ASC",
          ],
          ["id", "ASC"],
        ];
      }

      if (sortBy === "high-price") {
        order = [
          [
            Sequelize.literal("(`masterPackage`.price - (`masterPackage`.price * `masterPackage`.discountPercent / 100))"),
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
            favoriteType: "package",
          },
          required: false,
        });
      }

      const { count, rows: packages } = await masterPackage.findAndCountAll({
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

      await flashSaleService.syncStatuses();
      const activeFlashSales = await flashSale.findAll({
        where: { status: "ACTIVE" },
        include: [
          {
            model: flashSaleItem,
            as: "items",
            where: { itemType: "PACKAGE" },
          },
        ],
      });

      const result = packages.flatMap((prod) => {
        const plain = prod.get({ plain: true });
        // Sort primary images first in nested locations
        if (plain.locations) {
          plain.locations = plain.locations.map(loc => {
            if (loc.images) loc.images = sortPrimaryFirst(loc.images);
            return loc;
          });
        }

        let flashSaleInfo = null;
        let isFlashSale = false;

        for (const fs of activeFlashSales) {
          const item = fs.items.find((i) => i.packageId === plain.id);
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
          items: undefined,
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

  async create(data, userId) {
    const transaction = await sequelize.transaction();
    try {
      // Normalize array inputs (handle keys with [] suffix)
      const locationIds = data.locationIds || data["locationIds[]"];
      const consultationCategoryIds = data.consultationCategoryIds || data["consultationCategoryIds[]"];

      if (!data.name || data.name.trim() === "") {
        await transaction.rollback();
        return { status: false, message: "Name is required", data: null };
      }

      let code = data.code;

      // 🔹 1. Check for Duplicate NAME in any of the requested locations
      const existingName = await masterPackage.findOne({
        where: { name: data.name },
        include: [
          {
            model: masterLocation,
            as: "locations",
            where: { id: { [Op.in]: locationIds } },
            required: true,
          },
        ],
        paranoid: false,
        transaction,
      });

      if (existingName) {
        if (existingName.deletedAt) {
          // Restore and reuse
          await existingName.restore({ transaction });
          console.log(`[Package Create] Restored soft-deleted package with name: ${data.name}`);

          await existingName.update(
            {
              name: data.name,
              description: data.description || existingName.description,
              price: data.price ?? existingName.price,
              discountPercent: data.discountPercent ?? existingName.discountPercent,
              isActive: data.isActive ?? existingName.isActive,
              isVerified: false,
            },
            { transaction },
          );

          // Re-create items
          if (data.items && Array.isArray(data.items)) {
            await require("../models").masterPackageItems.destroy({
              where: { packageId: existingName.id },
              transaction,
            });
            const itemRecords = data.items.map((it) => ({
              serviceId: it.serviceId,
              qty: it.qty || 1,
              packageId: existingName.id,
            }));
            await require("../models").masterPackageItems.bulkCreate(itemRecords, { transaction });
          }

          await transaction.commit();

          // Re-assign associations (outside transaction)
          if (locationIds && Array.isArray(locationIds)) {
            await existingName.setLocations(locationIds);
          }
          if (consultationCategoryIds && Array.isArray(consultationCategoryIds)) {
            await existingName.setConsultationCategories(consultationCategoryIds);
          }

          return {
            status: true,
            message: "Package restored and updated successfully",
            data: existingName,
          };
        }

        await transaction.rollback();
        return {
          status: false,
          message: "Package with this name already exists in one or more selected locations",
          data: null,
        };
      }

      // 🔹 2. Check for Duplicate CODE (if provided) in any of the requested locations
      if (code) {
        const existingCode = await masterPackage.findOne({
          where: { code },
          include: [
            {
              model: masterLocation,
              as: "locations",
              where: { id: { [Op.in]: locationIds } },
              required: true,
            },
          ],
          paranoid: false,
          transaction,
        });

        if (existingCode) {
          await transaction.rollback();
          return {
            status: false,
            message: "CODE already exists in one or more selected locations",
            data: null,
          };
        }
      }

      // Auto-generate code if not provided
      if (!code) {
        const lastPackage = await masterPackage.findOne({
          order: [["code", "DESC"]],
          transaction,
          paranoid: false,
        });

        let lastNumber = 0;
        if (lastPackage?.code) {
          lastNumber = parseInt(lastPackage.code.replace("PKG-", ""), 10) || 0;
        }

        code = `PKG-${String(lastNumber + 1).padStart(3, "0")}`;
      }

      const newPackage = await masterPackage.create(
        {
          name: data.name,
          code,
          description: data.description || null,
          price: data.price ?? 0,
          discountPercent: data.discountPercent ?? 0,
          isActive: data.isActive ?? true,
          createdBy: userId,
        },
        { transaction },
      );

      // Create items if provided
      if (data.items && Array.isArray(data.items)) {
        const itemRecords = data.items.map(it => ({
          serviceId: it.serviceId,
          qty: it.qty || 1,
          packageId: newPackage.id
        }));
        await masterPackageItems.bulkCreate(itemRecords, { transaction });
      }

      await transaction.commit();

      // Many-to-many: assign locations (outside transaction since setLocations uses its own)
      if (locationIds && Array.isArray(locationIds)) {
        await newPackage.setLocations(locationIds);
      }

      if (consultationCategoryIds && Array.isArray(consultationCategoryIds)) {
        await newPackage.setConsultationCategories(consultationCategoryIds);
      }

      return {
        status: true,
        message: "Package & items created successfully",
        data: newPackage,
      };
    } catch (error) {
      await transaction.rollback();
      return { status: false, message: error.message, data: null };
    }
  },

  async update(id, data) {
    const transaction = await sequelize.transaction();
    try {
      const pkg = await masterPackage.findByPk(id, { transaction });

      if (!pkg) {
        await transaction.rollback();
        return {
          status: false,
          message: "Package not found",
          data: null,
        };
      }

      // Normalize array inputs
      const locationIds = data.locationIds || data["locationIds[]"];
      const code = data.code;

      // 1. Get current locations to compare
      const currentLocIds = (await pkg.getLocations({ attributes: ["id"], transaction })).map((l) => l.id);

      // 2. Determine what actually changed
      const nameChanged = data.name && data.name !== pkg.name;
      const codeChanged = code && code !== pkg.code;
      const locationsChanged =
        locationIds &&
        Array.isArray(locationIds) &&
        (locationIds.length !== currentLocIds.length ||
          !locationIds.every((id) => currentLocIds.includes(id)));

      // 🔹 Duplicate Check (scoped by locations)
      // Only check if name, code, or locations are being changed to something NEW
      if (nameChanged || codeChanged || locationsChanged) {
        const targetName = data.name || pkg.name;
        const targetCode = code || pkg.code;
        const targetLocations =
          locationIds && Array.isArray(locationIds) ? locationIds : currentLocIds;

        if (targetLocations.length > 0) {
          // 1. Name Check (Only if name changed or locations changed)
          if (nameChanged || locationsChanged) {
            const conflictName = await require("../models").masterPackage.findOne({
              where: {
                name: targetName,
                id: { [Op.ne]: id },
              },
              include: [
                {
                  model: require("../models").masterLocation,
                  as: "locations",
                  where: { id: { [Op.in]: targetLocations } },
                  required: true,
                },
              ],
              paranoid: false,
              transaction,
            });

            if (conflictName) {
              await transaction.rollback();
              return {
                status: false,
                message: "Package with this name already exists in one or more selected locations",
                data: null,
              };
            }
          }

          // 2. Code Check (Only if code changed or locations changed)
          if (codeChanged || locationsChanged) {
            const conflictCode = await require("../models").masterPackage.findOne({
              where: {
                code: targetCode,
                id: { [Op.ne]: id },
              },
              include: [
                {
                  model: require("../models").masterLocation,
                  as: "locations",
                  where: { id: { [Op.in]: targetLocations } },
                  required: true,
                },
              ],
              paranoid: false,
              transaction,
            });

            if (conflictCode) {
              await transaction.rollback();
              return {
                status: false,
                message: "CODE already exists in one or more selected locations",
                data: null,
              };
            }
          }
        }
      }

      if (pkg.isVerified) {
        await pkg.update(
          {
            price: data.price ?? pkg.price,
            discountPercent: data.discountPercent ?? pkg.discountPercent,
            isActive: data.isActive ?? pkg.isActive,
          },
          { transaction }
        );

        await transaction.commit();

        if (data.locationIds && Array.isArray(data.locationIds)) {
          await pkg.setLocations(data.locationIds);
        }

        // Jika ke depan package memakai categories, bisa ditambahkan juga di sini

        return {
          status: true,
          message: "Data paket sudah diverifikasi. Hanya harga, diskon, status aktif, dan lokasi yang diperbarui.",
          data: pkg,
        };
      }

      await pkg.update(
        {
          name: data.name ?? pkg.name,
          description: data.description ?? pkg.description,
          price: data.price ?? pkg.price,
          discountPercent: data.discountPercent ?? pkg.discountPercent,
          isActive: data.isActive ?? pkg.isActive,
          createdBy: data.createdBy ?? pkg.createdBy,
        },
        { transaction },
      );

      // Update items if provided
      if (data.items && Array.isArray(data.items)) {
        await masterPackageItems.destroy({
          where: { packageId: pkg.id },
          transaction
        });

        const itemRecords = data.items.map(it => ({
          serviceId: it.serviceId,
          qty: it.qty || 1,
          packageId: pkg.id
        }));
        await masterPackageItems.bulkCreate(itemRecords, { transaction });
      }

      await transaction.commit();

      // Many-to-many: update locations
      if (data.locationIds && Array.isArray(data.locationIds)) {
        await pkg.setLocations(data.locationIds);
      }

      return {
        status: true,
        message: "Package updated successfully",
        data: pkg,
      };
    } catch (error) {
      await transaction.rollback();
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
          model: masterLocation,
          as: "locations",
          through: { attributes: ["isActive"] },
          include: [
            {
              model: masterLocationImage,
              as: "images",
              attributes: ["id", "imageUrl"],
              limit: 1,
              separate: true,
            },
          ],
          attributes: [
            "id",
            "name",
            "latitude",
            "longitude",
            "cityId",
            "districtId",
            ...(distanceLiteral ? [[distanceLiteral, "distance"]] : []),
          ],
          required: !!(userLat && userLng),
        },
        {
          model: masterPackageItems,
          as: "items",
          attributes: ["packageId", "qty", "serviceId", "id"],
          include: [
            {
              model: masterService,
              as: "service",
              attributes: ["id", "name"],
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
            favoriteType: "package",
          },
          required: false,
        });
      }

      const pkg = await masterPackage.findByPk(id, {
        include,
      });

      if (!pkg) {
        return { status: false, message: "Package not found", data: null };
      }

      const plain = pkg.get({ plain: true });
      // Sort primary images first in nested locations
      if (plain.locations) {
        plain.locations = plain.locations.map(loc => {
          if (loc.images) loc.images = sortPrimaryFirst(loc.images);
          return loc;
        });
      }

      // Flash Sale Integration
      const flashSaleServiceLocal = require("./flashSale.service");
      await flashSaleServiceLocal.syncStatuses();
      const activeFlashSales = await flashSale.findAll({
        where: { status: "ACTIVE" },
        include: [
          {
            model: flashSaleItem,
            as: "items",
            where: { itemType: "PACKAGE", packageId: id },
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

      const mapped = mapPackageWithBackwardCompat(plain);
      return {
        status: true,
        message: "Success",
        data: {
          ...mapped,
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

  async getByLocationId(customerId, locationId, isCustomer) {
    try {
      const where = {
        isActive: true,
        isVerified: true
      };

      const include = [
        {
          model: masterLocation,
          as: "locations",
          where: { id: locationId },
          through: {
            attributes: ["isActive"],
            ...(isCustomer == 1 || isCustomer == "1" ? { where: { isActive: true } } : {}),
          },
          required: true,
          attributes: ["id", "name", "latitude", "longitude", "cityId", "districtId", "biteshipAreaId"],
          include: [
            {
              model: masterLocationImage,
              as: "images",
              attributes: ["imageUrl", "id"],
              limit: 1,
              separate: true,
            },
          ],
        },
        {
          model: masterPackageItems,
          as: "items",
          attributes: ["packageId", "qty", "serviceId", "id"],
          include: [
            {
              model: masterService,
              as: "service",
              attributes: ["id", "name"],
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
            favoriteType: "package",
          },
          required: false,
        });
      }
      const packages = await masterPackage.findAll({
        where,
        include,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
        order: [["name", "ASC"]],
      });

      if (!packages) {
        return { status: false, message: "Package not found", data: null };
      }

      await flashSaleService.syncStatuses();
      const activeFlashSales = await flashSale.findAll({
        where: { status: "ACTIVE" },
        include: [
          {
            model: flashSaleItem,
            as: "items",
            where: { itemType: "PACKAGE" },
          },
        ],
      });

      const result = packages.map((prod) => {
        const plain = prod.get({ plain: true });
        // Sort primary images first in nested locations
        if (plain.locations) {
          plain.locations = plain.locations.map(loc => {
            if (loc.images) loc.images = sortPrimaryFirst(loc.images);
            return loc;
          });
        }

        let flashSaleInfo = null;
        let isFlashSale = false;

        for (const fs of activeFlashSales) {
          const item = fs.items.find((i) => i.packageId === plain.id);
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
          items: undefined,
        };

        const mapped = mapPackageWithBackwardCompat(lightPlain);

        return {
          ...mapped,
          biteshipId: mapped.location?.biteshipAreaId || null,
          image: plain.locations?.[0]?.images?.[0]?.imageUrl || null,
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

  async createItemPackage(data) {
    const transaction = await sequelize.transaction();
    try {
      if (!data.serviceId || !data.packageId || !data.qty) {
        await transaction.rollback();
        return { status: false, message: "Data tidak lengkap", data: null };
      }

      const pkg = await masterPackage.findOne({
        where: { id: data.packageId },
        transaction,
      });

      if (!pkg) {
        await transaction.rollback();
        return { status: false, message: "Package tidak ditemukan", data: null };
      }

      const service = await masterService.findOne({
        where: { id: data.serviceId },
        transaction,
      });

      if (!service) {
        await transaction.rollback();
        return { status: false, message: "Service tidak ditemukan", data: null };
      }

      // Validate: package and service must share at least 1 location
      const pkgLocations = await relationshipPackageLocation.findAll({
        where: { packageId: data.packageId },
        attributes: ["locationId"],
        raw: true,
        transaction,
      });
      const svcLocations = await relationshipServiceLocation.findAll({
        where: { serviceId: data.serviceId },
        attributes: ["locationId"],
        raw: true,
        transaction,
      });

      const pkgLocIds = pkgLocations.map((r) => r.locationId);
      const svcLocIds = svcLocations.map((r) => r.locationId);
      const hasCommon = pkgLocIds.some((id) => svcLocIds.includes(id));

      if (!hasCommon) {
        await transaction.rollback();
        return {
          status: false,
          message: "Package dan Service harus memiliki minimal 1 lokasi yang sama",
          data: null,
        };
      }

      const existing = await masterPackageItems.findOne({
        where: { serviceId: data.serviceId, packageId: data.packageId },
        transaction,
      });

      if (existing) {
        await transaction.rollback();
        return {
          status: false,
          message: "Layanan ini sudah ada",
          data: null,
        };
      }

      const newPackageItem = await masterPackageItems.create(
        {
          serviceId: data.serviceId,
          qty: data.qty ?? 1,
          packageId: data.packageId,
        },
        { transaction },
      );
      await transaction.commit();
      return {
        status: true,
        message: "Package & items created successfully",
        data: newPackageItem,
      };
    } catch (error) {
      await transaction.rollback();
      return { status: false, message: error.message, data: null };
    }
  },

  async updateItemPackage(packageItemId, data) {
    const transaction = await sequelize.transaction();

    try {
      if (!data.serviceId || !packageItemId || !data.qty) {
        await transaction.rollback();
        return {
          status: false,
          message: "Data tidak lengkap",
          data: null,
        };
      }

      const existing = await masterPackageItems.findOne({
        where: { id: packageItemId },
        transaction,
      });

      if (!existing) {
        await transaction.rollback();
        return {
          status: false,
          message: "Item paket tidak ditemukan",
          data: null,
        };
      }

      const duplicate = await masterPackageItems.findOne({
        where: {
          serviceId: data.serviceId,
          packageId: data.packageId,
          id: {
            [Op.ne]: packageItemId,
          },
        },
        transaction,
      });

      if (duplicate) {
        await transaction.rollback();
        return {
          status: false,
          message: "Service sudah ada di item paket ini",
          data: null,
        };
      }

      const dataUpdate = await existing.update(
        {
          serviceId: data.serviceId,
          qty: data.qty ?? 1,
        },
        { transaction },
      );

      await transaction.commit();

      return {
        status: true,
        message: "Package item update successfully",
        data: dataUpdate,
      };
    } catch (error) {
      await transaction.rollback();
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },

  async deletePackage(id) {
    try {
      if (!id) {
        return { status: false, message: "Data tidak lengkap", data: null };
      }
      const pkg = await masterPackage.findByPk(id);
      if (!pkg) {
        return {
          status: false,
          message: "Package tidak ditemukan",
          data: null,
        };
      }

      if (pkg.isVerified) {
        return {
          status: false,
          message: "Package sudah diverifikasi dan tidak dapat dihapus",
          data: null,
        };
      }

      await pkg.destroy();

      return {
        status: true,
        message: "Package berhasil di hapus",
        data: pkg,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async deletePackageItem(id) {
    try {
      if (!id) {
        return { status: false, message: "Data tidak lengkap", data: null };
      }
      const packageItem = await masterPackageItems.findByPk(id);

      if (!packageItem) {
        return {
          status: false,
          message: "Package tidak ditemukan",
          data: null,
        };
      }

      await packageItem.destroy();

      return {
        status: true,
        message: "Package berhasil di hapus",
        data: packageItem,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
  async getPackageByUser({ id: userId, roleCode, locationIds }, filters = {}, pagination = {}) {
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

    const targetIdsFromFilter = locationId
      ? Array.isArray(locationId)
        ? locationId
        : locationId.toString().split(",")
      : undefined;

    // Authorization check for locationId filter
    if (targetIdsFromFilter && roleCode !== "SUPER_ADMIN" && roleCode !== "OPERATIONAL_ADMIN") {
      const isAllowed = targetIdsFromFilter.every(id => locationIds.includes(id));
      if (!isAllowed) {
        return { status: false, message: "Location not allowed or not found for this user" };
      }
    }

    const whereClause = {};
    if (name) {
      whereClause.name = { [Op.like]: `%${name}%` };
    }

    const include = [
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
      {
        model: masterPackageItems,
        as: "items",
        attributes: ["packageId", "qty", "serviceId", "id"],
        include: [
          {
            model: masterService,
            as: "service",
            attributes: ["id", "name"],
            include: {
              model: masterSubCategoryService,
              as: "categories",
              through: { attributes: [] },
              attributes: ["id", "name"],
            },
          },
        ],
      },
    ];
    try {
      let finalInclude;
      if (roleCode === "SUPER_ADMIN" || roleCode === "OPERATIONAL_ADMIN") {
        if (targetIdsFromFilter) {
          finalInclude = include.map((inc) => {
            if (inc.as === "locations") {
              return {
                ...inc,
                where: { id: { [Op.in]: targetIdsFromFilter } },
                required: true,
              };
            }
            return inc;
          });
        } else {
          finalInclude = include;
        }
      } else {
        // Filter by user's locations via pivot (further restricted if locationId filter provided)
        const targetIds = targetIdsFromFilter || locationIds;
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

      const { count: totalCount, rows: packages } = await masterPackage.findAndCountAll({
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

      const totalActiveItem = await masterPackage.count({
        where: { ...whereClause, isActive: true },
        include: finalInclude,
        distinct: true,
      });

      const totalVerifiedItem = await masterPackage.count({
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
        data: packages.map((p) => {
          const plain = p.get({ plain: true });
          return {
            ...mapPackageWithBackwardCompat(plain),
            statusVerification: plain.verificationStatus?.status || null,
            noteVerification: plain.verificationStatus?.note || null,
          };
        }),
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  async getPackageByCreator(userId) {
    try {
      const include = [
        {
          model: masterLocation,
          as: "locations",
          through: { attributes: ["isActive"] },
          attributes: ["id", "name", "cityId", "districtId"],
        },
        {
          model: masterPackageItems,
          as: "items",
          attributes: ["packageId", "qty", "serviceId", "id"],
          include: [
            {
              model: masterService,
              as: "service",
              attributes: ["id", "name"],
            },
          ],
        },
      ];
      const packages = await masterPackage.findAll({
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
        data: packages.map((p) => {
          const plain = p.get({ plain: true });
          return mapPackageWithBackwardCompat(plain);
        }),
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Toggle isActive for a specific package-location pivot entry
   */
  async toggleLocationActive(packageId, locationId) {
    try {
      const pivot = await relationshipPackageLocation.findOne({
        where: { packageId, locationId },
      });

      if (!pivot) {
        return {
          status: false,
          message: "Package tidak terdaftar di lokasi ini",
          data: null,
        };
      }

      pivot.isActive = !pivot.isActive;
      await pivot.save();

      return {
        status: true,
        message: `Package di lokasi ini sekarang ${pivot.isActive ? "aktif" : "non-aktif"}`,
        data: pivot,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
