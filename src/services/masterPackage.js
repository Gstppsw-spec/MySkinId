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
  flashSale,
  flashSaleItem,
} = require("../models");
const sequelize = require("../models").sequelize;
const flashSaleService = require("./flashSale.service");

const { Op, Sequelize } = require("sequelize");

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
        sort,
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
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where[Op.and] = Sequelize.literal(`
        (price - (price * discountPercent / 100))
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

      const result = packages.map((prod) => {
        const plain = prod.get({ plain: true });

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

  async create(data, userId) {
    const transaction = await sequelize.transaction();
    try {
      if (!data.name || data.name.trim() === "") {
        await transaction.rollback();
        return { status: false, message: "Name is required", data: null };
      }

      let code = data.code;
      if (!code) {
        const lastPackage = await masterPackage.findOne({
          order: [["code", "DESC"]],
          transaction,
        });

        let lastNumber = 0;
        if (lastPackage?.code) {
          lastNumber = parseInt(lastPackage.code.replace("PKG-", ""), 10) || 0;
        }

        code = `PKG-${String(lastNumber + 1).padStart(3, "0")}`;
      } else {
        const existing = await masterPackage.findOne({
          where: { code },
          transaction,
        });

        if (existing) {
          await transaction.rollback();
          return {
            status: false,
            message: "CODE already exists",
            data: null,
          };
        }
      }

      const newPackage = await masterPackage.create(
        {
          name: data.name,
          code,
          description: data.description || null,
          price: data.price ?? 0,
          discountPercent: data.discountPercent ?? 0,
          isActive: data.isActive ?? true,
          locationId: data.locationId,
          createdBy: userId,
        },
        { transaction },
      );

      // if (Array.isArray(data.items) && data.items.length > 0) {
      //   const itemsPayload = data.items.map((item) => ({
      //     packageId: newPackage.id,
      //     serviceId: item.serviceId,
      //     qty: item.qty ?? 1,
      //   }));

      //   await masterPackageItems.bulkCreate(itemsPayload, {
      //     transaction,
      //   });
      // }
      await transaction.commit();
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

      // if (!Array.isArray(data.items) || data.items.length === 0) {
      //   await transaction.rollback();
      //   return {
      //     status: false,
      //     message: "Package must have at least one item",
      //     data: null,
      //   };
      // }

      // for (const item of data.items) {
      //   if (!item.serviceId) {
      //     await transaction.rollback();
      //     return {
      //       status: false,
      //       message: "Each item must have serviceId",
      //       data: null,
      //     };
      //   }
      //   if (item.qty !== undefined && item.qty < 1) {
      //     await transaction.rollback();
      //     return {
      //       status: false,
      //       message: "Item qty must be at least 1",
      //       data: null,
      //     };
      //   }
      // }

      await pkg.update(
        {
          name: data.name ?? pkg.name,
          description: data.description ?? pkg.description,
          price: data.price ?? pkg.price,
          discountPercent: data.discountPercent ?? pkg.discountPercent,
          isActive: data.isActive ?? pkg.isActive,
          createdBy: data.createdBy ?? pkg.createdBy,
          // locationId: data.locationId ?? pkg.locationId,
        },
        { transaction },
      );

      // await masterPackageItems.destroy({
      //   where: { packageId: id },
      //   transaction,
      // });

      // const itemsPayload = data.items.map((item) => ({
      //   packageId: id,
      //   serviceId: item.serviceId,
      //   qty: item.qty ?? 1,
      // }));

      // await masterPackageItems.bulkCreate(itemsPayload, {
      //   transaction,
      // });

      await transaction.commit();

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
          ...(distanceLiteral && maxDistance
            ? {
              where: Sequelize.where(distanceLiteral, {
                [Op.lte]: maxDistance,
              }),
            }
            : {}),
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

      const package = await masterPackage.findByPk(id, {
        include,
      });

      if (!package) {
        return { status: false, message: "Product not found", data: null };
      }

      const plain = package.get({ plain: true });

      // Flash Sale Integration
      const flashSaleService = require("./flashSale.service");
      await flashSaleService.syncStatuses();
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

  async getByLocationId(customerId, locationId, isCustomer) {
    try {
      const where = {};

      if (isCustomer == 1 || isCustomer == "1") {
        where.isActive = true;
      }

      where.locationId = locationId;

      const include = [
        {
          model: masterLocation,
          as: "location",
          attributes: ["id"],
          include: [
            {
              model: masterLocationImage,
              as: "images",
              attributes: ["imageUrl"],
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
        return { status: false, message: "Product not found", data: null };
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

        return {
          ...plain,
          image: plain.location?.images?.[0]?.imageUrl || null,
          isFlashSale,
          flashSale: flashSaleInfo,
          isFavorite: customerId
            ? plain.favorites && plain.favorites.length > 0
            : false,
          favorites: undefined,
          location: undefined,
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

      const package = await masterPackage.findOne({
        where: { id: data.packageId },
        transaction,
      });

      if (!package) {
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

      if (package.locationId !== service.locationId) {
        await transaction.rollback();
        return { status: false, message: "Package dan Service harus berada di lokasi yang sama", data: null };
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

      // 1️⃣ Ambil item yang mau di-update
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
      const package = await masterPackage.findByPk(id);

      if (!package) {
        return {
          status: false,
          message: "Package tidak ditemukan",
          data: null,
        };
      }

      await package.destroy();

      return {
        status: true,
        message: "Package berhasil di hapus",
        data: package,
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

  async getPackageByUser({ id: userId, roleCode, locationIds }) {
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
        model: masterLocation,
        as: "location",
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
      if (roleCode === "SUPER_ADMIN") {
        const packages = await masterPackage.findAll({
          include,
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
        });
        return {
          status: true,
          message: "Success",
          data: packages,
        };
      }

      const packages = await masterPackage.findAll({
        where: {
          locationId: {
            [Op.in]: locationIds,
          },
        },
        include,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
      });

      return {
        status: true,
        message: "Success",
        data: packages,
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
          as: "location",
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
      console.log("userId=", userId);
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
        data: packages,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
};
