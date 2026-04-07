const { Op } = require("sequelize");
const {
  flashSale,
  flashSaleItem,
  masterProduct,
  masterProductImage,
  masterPackage,
  masterLocation,
  masterLocationImage,
  relationshipProductLocation,
  relationshipPackageLocation,
  sequelize,
} = require("../models");

/**
 * Auto-update status flash sale berdasarkan waktu sekarang.
 */
async function syncStatuses() {
  const now = new Date();

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

/* ── Include helpers ──────────────────────────── */

const itemIncludes = [
  {
    model: masterLocation,
    as: "location",
    attributes: ["id", "name"],
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
      if (statusFilter) where.status = statusFilter;
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

      return { status: true, message: "Success", data };
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
      } else {
        // Recalculate status based on time
        const now = new Date();
        const start = existing.startDate;
        const end = existing.endDate;
        if (now < start) existing.status = "UPCOMING";
        else if (now >= start && now < end) existing.status = "ACTIVE";
        else existing.status = "ENDED";
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
  async registerItems(flashSaleId, data) {
    const t = await sequelize.transaction();
    try {
      const { locationId, items } = data;
      const fs = await flashSale.findByPk(flashSaleId);
      if (!fs) throw new Error("Flash sale not found");

      if (!locationId) throw new Error("locationId is required");
      if (!items || !Array.isArray(items) || items.length === 0) throw new Error("items array is required");

      const results = [];
      for (const item of items) {
        const { itemType, productId, packageId, flashPrice, quota } = item;

        if (!itemType || !["PRODUCT", "PACKAGE"].includes(itemType)) throw new Error("itemType must be PRODUCT or PACKAGE");
        
        // Ownership Validation (Checking pivot tables for Multi-Location support)
        if (itemType === "PRODUCT") {
          if (!productId) throw new Error("productId is required for PRODUCT type");
          
          const isLinked = await relationshipProductLocation.findOne({
            where: { productId, locationId, isActive: true },
            transaction: t
          });
          
          if (!isLinked) throw new Error(`Product ${productId} does not belong to outlet ${locationId} or is not active`);
        } else if (itemType === "PACKAGE") {
          if (!packageId) throw new Error("packageId is required for PACKAGE type");
          
          const isLinked = await relationshipPackageLocation.findOne({
            where: { packageId, locationId, isActive: true },
            transaction: t
          });
          
          if (!isLinked) throw new Error(`Package ${packageId} does not belong to outlet ${locationId} or is not active`);
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
          flashPrice: flashPrice || 0,
          quota: quota || 0,
          sold: 0
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

      return {
        status: true,
        message: "Success",
        data: {
          flashSale: fs,
          items,
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

  async getActive() {
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

      return { status: true, message: "Success", data };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
};
