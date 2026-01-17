const {
  masterPackage,
  customerFavorites,
  masterLocation,
  masterLocationImage,
  masterPackageItems,
  masterService,
  masterSubCategoryService,
} = require("../models");
const sequelize = require("../models").sequelize;

const { Op, Sequelize } = require("sequelize");

module.exports = {
  async getAllPackage(filters = {}) {
    try {
      const {
        minPrice,
        maxPrice,
        userLat,
        userLng,
        maxDistance,
        sort,
        customerId,
        isCustomer,
        categoryIds,
      } = filters;

      const where = {};

      if (isCustomer == 1 || isCustomer == "1") {
        where.isActive = true;
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
            favoriteType: "package",
          },
          required: false,
        });
      }

      const package = await masterPackage.findAll({
        where,
        include,
        order,
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
      });

      const result = package.map((prod) => {
        const plain = prod.get({ plain: true });
        return {
          ...plain,
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
      return {
        status: false,
        message: error.message,
        data: null,
      };
    }
  },

  async create(data) {
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
          locationId: data.locationId ?? pkg.locationId,
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
            favoriteType: "product",
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

  async getByLocationId(customerId, locationId, isCustomer) {
    try {
      const where = {};

      if (isCustomer == 1 || isCustomer == "1") {
        where.isActive = true;
      }

      where.locationId = locationId;

      const include = [
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
            favoriteType: "product",
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

      const result = packages.map((prod) => {
        const plain = prod.get({ plain: true });
        return {
          ...plain,
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
          packageId: data.packageId,
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
};
