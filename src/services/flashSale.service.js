const { Op } = require("sequelize");
const {
  flashSale,
  flashSaleItem,
  masterProduct,
  masterProductImage,
  masterPackage,
  masterService,
  masterLocation,
  masterLocationImage,
  relationshipProductLocation,
  relationshipPackageLocation,
  relationshipServiceLocation,
  relationshipUserCompany,
  sequelize,
} = require("../models");

/**
 * Auto-update status flash sale berdasarkan waktu sekarang.
 */
async function syncStatuses() {
  const now = new Date();

  // 1. Demote ACTIVE to UPCOMING if startDate is in the future
  await flashSale.update(
    { status: "UPCOMING" },
    {
      where: {
        status: "ACTIVE",
        startDate: { [Op.gt]: now },
      },
    }
  );

  // 2. Promote UPCOMING to ACTIVE if current time is within range
  await flashSale.update(
    { status: "ACTIVE" },
    {
      where: {
        status: "UPCOMING",
        startDate: { [Op.lte]: now },
        endDate: { [Op.gt]: now },
      },
    }
  );

  // 3. Mark as ENDED if endDate has passed
  await flashSale.update(
    { status: "ENDED" },
    {
      where: {
        status: { [Op.in]: ["UPCOMING", "ACTIVE"] },
        endDate: { [Op.lte]: now },
      },
    }
  );
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 */
function getDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

/* ── Include helpers ──────────────────────────── */

const itemIncludes = [
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
      },
    ],
  },
  {
    model: masterProduct,
    as: "product",
    attributes: ["id", "name", "price", "discountPercent"],
    include: [
      {
        model: masterProductImage,
        as: "images",
        attributes: ["id", "imageUrl"],
      },
    ],
  },
  {
    model: masterPackage,
    as: "package",
    attributes: ["id", "name", "price", "discountPercent"],
  },
  {
    model: masterService,
    as: "service",
    attributes: ["id", "name", "price", "discountPercent"],
  },
];

module.exports = {
  syncStatuses,
  /* ═══════════════════════════════════════════════
     SUPER ADMIN — Kelola Flash Sale Event
     ═══════════════════════════════════════════════ */

  /**
   * Buat flash sale event baru (Super Admin).
   */
  async create(data) {
    try {
      console.log(data);
      const { title, startDate, endDate } = data;
      if (!title || title.trim() === "") throw new Error("title is required");
      if (!startDate || !endDate) throw new Error("startDate and endDate are required");

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) throw new Error("endDate must be after startDate");

      const now = new Date();
      let initialStatus = "UPCOMING";
      if (now >= start && now < end) initialStatus = "ACTIVE";
      if (now >= end) initialStatus = "ENDED";

      const fs = await flashSale.create({
        title,
        startDate: start,
        endDate: end,
        status: initialStatus,
      });
      return { status: true, message: "Flash sale created", data: fs };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * List semua flash sale.
   */
  async getAll(statusFilter, pagination = {}, name = null) {
    try {
      await syncStatuses();

      const { limit, offset } = pagination;

      const where = {};
      if (statusFilter) {
        if (typeof statusFilter === "string") {
          const statuses = statusFilter.split(",").map(s => s.trim().toUpperCase());
          if (statuses.length > 1) {
            where.status = { [Op.in]: statuses };
          } else {
            where.status = statuses[0];
          }
        } else if (Array.isArray(statusFilter)) {
          where.status = { [Op.in]: statusFilter.map(s => s.trim().toUpperCase()) };
        } else {
          where.status = statusFilter;
        }
      }
      if (name) where.title = { [Op.like]: `%${name}%` };

      const { count, rows: data } = await flashSale.findAndCountAll({
        where,
        order: [["startDate", "DESC"]],
        limit,
        offset,
        subQuery: false,
        distinct: true,
      });

      return {
        status: true,
        message: "Success",
        data,
        totalCount: count,
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Detail flash sale + semua items.
   */
  async getById(id) {
    try {
      await syncStatuses();

      const data = await flashSale.findByPk(id, {
        include: [
          {
            model: flashSaleItem,
            as: "items",
            include: itemIncludes,
          },
        ],
      });

      if (!data) return { status: false, message: "Flash sale not found" };

      // Map images for PACKAGE and SERVICE
      const plain = data.get({ plain: true });
      if (plain.items) {
        plain.items = plain.items.map(item => {
          if (item.itemType === "PACKAGE" && item.package && item.location?.images) {
            item.package.images = item.location.images;
          } else if (item.itemType === "SERVICE" && item.service && item.location?.images) {
            item.service.images = item.location.images;
          }
          return item;
        });
      }

      return { status: true, message: "Success", data: plain };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Update flash sale (Super Admin).
   */
  async update(id, data) {
    try {
      const existing = await flashSale.findByPk(id);
      if (!existing) return { status: false, message: "Flash sale not found" };

      const { title, startDate, endDate, status } = data;

      if (title !== undefined) existing.title = title;
      if (startDate !== undefined) existing.startDate = new Date(startDate);
      if (endDate !== undefined) existing.endDate = new Date(endDate);

      if (status) {
        existing.status = status;
      }

      // Recalculate/Enforce status based on dates if start date is in the future or event has ended
      const now = new Date();
      const start = existing.startDate;
      const end = existing.endDate;
      if (now < start) {
        existing.status = "UPCOMING";
      } else if (now >= end) {
        existing.status = "ENDED";
      } else if (!status) {
        // If status was not provided and we are in active range, set to ACTIVE
        existing.status = "ACTIVE";
      }

      await existing.save();
      return { status: true, message: "Flash sale updated successfully", data: existing };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Hapus flash sale + semua items (Super Admin).
   */
  async delete(id) {
    try {
      const existing = await flashSale.findByPk(id);
      if (!existing) return { status: false, message: "Flash sale not found" };

      await flashSaleItem.destroy({ where: { flashSaleId: id } });
      await existing.destroy();

      return { status: true, message: "Flash sale deleted successfully", data: { id } };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /* ═══════════════════════════════════════════════
     OUTLET ADMIN — Daftarkan Items ke Flash Sale
     ═══════════════════════════════════════════════ */

  /**
   * Outlet mendaftarkan items ke flash sale.
   */
  async registerItems(flashSaleId, data, user = {}) {
    const t = await sequelize.transaction();
    try {
      const { locationId, items } = data;
      const { roleCode, id: userId } = user;

      const fs = await flashSale.findByPk(flashSaleId);
      if (!fs) throw new Error("Flash sale not found");

      if (!locationId) throw new Error("locationId is required");
      if (!items || !Array.isArray(items) || items.length === 0) throw new Error("items array is required");

      // For COMPANY_ADMIN, we need to know the target company
      let targetCompanyId = null;
      if (roleCode === "COMPANY_ADMIN") {
        const loc = await masterLocation.findByPk(locationId, { attributes: ["companyId"], transaction: t });
        if (!loc) throw new Error("Target outlet not found");
        targetCompanyId = loc.companyId;
      }

      const results = [];
      for (const item of items) {
        const { itemType, productId, packageId, serviceId, flashPrice, quota, maxBuyPerCustomer } = item;

        if (!itemType || !["PRODUCT", "PACKAGE", "SERVICE"].includes(itemType)) throw new Error("itemType must be PRODUCT, PACKAGE, or SERVICE");
        
        // Ownership Validation
        if (roleCode !== "SUPER_ADMIN") {
          if (itemType === "PRODUCT") {
            if (!productId) throw new Error("productId is required for PRODUCT type");
            
            const isLinked = await relationshipProductLocation.findOne({
              where: { productId, locationId, isActive: true },
              transaction: t
            });
            
            if (!isLinked) {
              // Fallback for COMPANY_ADMIN: Check if product belongs to any outlet of the same company
              if (roleCode === "COMPANY_ADMIN" && targetCompanyId) {
                const belongsToCompany = await relationshipProductLocation.findOne({
                  where: { productId, isActive: true },
                  include: [{
                    model: masterLocation,
                    as: "location",
                    where: { companyId: targetCompanyId },
                    attributes: ["id"]
                  }],
                  transaction: t
                });

                if (!belongsToCompany) {
                  throw new Error(`Product ${productId} does not belong to your company's outlets`);
                }
                
                // Optional: Auto-link to target outlet if needed, but for now just allow registration
              } else {
                throw new Error(`Product ${productId} does not belong to outlet ${locationId} or is not active`);
              }
            }
          } else if (itemType === "PACKAGE") {
            if (!packageId) throw new Error("packageId is required for PACKAGE type");
            
            const isLinked = await relationshipPackageLocation.findOne({
              where: { packageId, locationId, isActive: true },
              transaction: t
            });
            
            if (!isLinked) {
              if (roleCode === "COMPANY_ADMIN" && targetCompanyId) {
                const belongsToCompany = await relationshipPackageLocation.findOne({
                  where: { packageId, isActive: true },
                  include: [{
                    model: masterLocation,
                    as: "location",
                    where: { companyId: targetCompanyId },
                    attributes: ["id"]
                  }],
                  transaction: t
                });

                if (!belongsToCompany) {
                  throw new Error(`Package ${packageId} does not belong to your company's outlets`);
                }
              } else {
                throw new Error(`Package ${packageId} does not belong to outlet ${locationId} or is not active`);
              }
            }
          } else if (itemType === "SERVICE") {
            if (!serviceId) throw new Error("serviceId is required for SERVICE type");
            
            const isLinked = await relationshipServiceLocation.findOne({
              where: { serviceId, locationId, isActive: true },
              transaction: t
            });
            
            if (!isLinked) {
              if (roleCode === "COMPANY_ADMIN" && targetCompanyId) {
                const belongsToCompany = await relationshipServiceLocation.findOne({
                  where: { serviceId, isActive: true },
                  include: [{
                    model: masterLocation,
                    as: "location",
                    where: { companyId: targetCompanyId },
                    attributes: ["id"]
                  }],
                  transaction: t
                });

                if (!belongsToCompany) {
                  throw new Error(`Service ${serviceId} does not belong to your company's outlets`);
                }
              } else {
                throw new Error(`Service ${serviceId} does not belong to outlet ${locationId} or is not active`);
              }
            }
          }
        }

        // Cek duplikasi di jam flash sale yang sama
        const overlappingFs = await flashSale.findAll({
          where: {
            status: { [Op.in]: ["UPCOMING", "ACTIVE"] },
            [Op.and]: [
              { startDate: { [Op.lt]: fs.endDate } },
              { endDate: { [Op.gt]: fs.startDate } }
            ]
          },
          transaction: t
        });
        const fsIds = overlappingFs.map(f => f.id);
        if (!fsIds.includes(flashSaleId)) fsIds.push(flashSaleId);

        const isDuplicate = await flashSaleItem.findOne({
          where: {
            flashSaleId: { [Op.in]: fsIds },
            locationId,
            itemType,
            productId: itemType === "PRODUCT" ? productId : null,
            packageId: itemType === "PACKAGE" ? packageId : null,
            serviceId: itemType === "SERVICE" ? serviceId : null,
          },
          transaction: t
        });

        if (isDuplicate) {
          throw new Error(`Produk/Paket sudah terdaftar di Flash Sale pada waktu yang sama.`);
        }

        const newItem = await flashSaleItem.create({
          flashSaleId,
          locationId,
          itemType,
          productId: itemType === "PRODUCT" ? productId : null,
          packageId: itemType === "PACKAGE" ? packageId : null,
          serviceId: itemType === "SERVICE" ? serviceId : null,
          flashPrice: flashPrice || 0,
          quota: quota || 0,
          sold: 0,
          maxBuyPerCustomer: maxBuyPerCustomer || 0
        }, { transaction: t });

        results.push(newItem);
      }

      await t.commit();
      return { status: true, message: "Items registered successfully", data: results };
    } catch (error) {
      await t.rollback();
      return { status: false, message: error.message };
    }
  },

  /**
   * Lihat items yang didaftarkan outlet di flash sale tertentu.
   */
  async getItemsByLocation(flashSaleId, locationId) {
    try {
      const fs = await flashSale.findByPk(flashSaleId);
      if (!fs) return { status: false, message: "Flash sale not found" };

      const items = await flashSaleItem.findAll({
        where: { flashSaleId, locationId },
        include: itemIncludes,
      });

      const result = items.map(item => {
        const plain = item.get({ plain: true });
        if (plain.itemType === "PACKAGE" && plain.package && plain.location?.images) {
          plain.package.images = plain.location.images;
        } else if (plain.itemType === "SERVICE" && plain.service && plain.location?.images) {
          plain.service.images = plain.location.images;
        }
        return plain;
      });

      return {
        status: true,
        message: "Success",
        data: {
          flashSale: fs,
          items: result,
        },
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /**
   * Hapus satu item dari flash sale (Outlet Admin).
   */
  async removeItem(itemId) {
    try {
      const item = await flashSaleItem.findByPk(itemId);
      if (!item) return { status: false, message: "Flash sale item not found" };

      await item.destroy();
      return { status: true, message: "Item removed successfully", data: { id: itemId } };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /* ═══════════════════════════════════════════════
     CUSTOMER — Browse Flash Sale Aktif
     ═══════════════════════════════════════════════ */

  async getActive(userLat, userLng) {
    try {
      await syncStatuses();

      const data = await flashSale.findAll({
        where: { status: "ACTIVE" },
        include: [
          {
            model: flashSaleItem,
            as: "items",
            include: itemIncludes,
          },
        ],
        order: [["endDate", "ASC"]],
      });

      const result = data.map(fs => {
        const plain = fs.get({ plain: true });
        if (plain.items) {
          plain.items = plain.items.map(item => {
            if (item.itemType === "PACKAGE" && item.package && item.location?.images) {
              item.package.images = item.location.images;
            } else if (item.itemType === "SERVICE" && item.service && item.location?.images) {
              item.service.images = item.location.images;
            }

            // Calculate distance if location lat/lng exist
            if (userLat !== undefined && userLng !== undefined && item.location?.latitude && item.location?.longitude) {
              const itemLat = parseFloat(item.location.latitude);
              const itemLng = parseFloat(item.location.longitude);
              const d = getDistance(userLat, userLng, itemLat, itemLng);
              if (d !== null) {
                item.distance = Math.round(d * 10) / 10;
                item.distanceLabel = `${item.distance} km`;
              } else {
                item.distance = null;
                item.distanceLabel = null;
              }
            } else {
              item.distance = null;
              item.distanceLabel = null;
            }

            return item;
          });

          // Sort items by distance if user location is provided
          if (userLat !== undefined && userLng !== undefined) {
            plain.items.sort((a, b) => {
              if (a.distance === null || a.distance === undefined) return 1;
              if (b.distance === null || b.distance === undefined) return -1;
              return a.distance - b.distance;
            });
          }
        }
        return plain;
      });

      return { status: true, message: "Success", data: result };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
};
