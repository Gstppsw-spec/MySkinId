const { Op, Sequelize } = require("sequelize");
const {
  flashSale,
  flashSaleItem,
  masterProduct,
  masterProductImage,
  masterLocation,
} = require("../models");

/**
 * Secara otomatis update status flash sale berdasarkan waktu sekarang.
 * Dipanggil sebelum query agar data selalu up-to-date.
 */
async function syncStatuses() {
  const now = new Date();

  // UPCOMING → ACTIVE  (sudah lewat startDate, belum lewat endDate)
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

  // ACTIVE / UPCOMING → ENDED  (sudah lewat endDate)
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

module.exports = {
  /**
   * Buat flash sale baru beserta item-itemnya.
   * body: { locationId, title, startDate, endDate, items: [{ productId, flashPrice, stock }] }
   */
  async create(data) {
    try {
      if (!data.locationId) {
        return { status: false, message: "locationId is required", data: null };
      }
      if (!data.title || data.title.trim() === "") {
        return { status: false, message: "title is required", data: null };
      }
      if (!data.startDate || !data.endDate) {
        return { status: false, message: "startDate and endDate are required", data: null };
      }

      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end <= start) {
        return { status: false, message: "endDate must be after startDate", data: null };
      }

      // Tentukan status awal berdasarkan waktu
      const now = new Date();
      let initialStatus = "UPCOMING";
      if (now >= start && now < end) initialStatus = "ACTIVE";
      if (now >= end) initialStatus = "ENDED";

      const newFlashSale = await flashSale.create({
        locationId: data.locationId,
        title: data.title,
        startDate: start,
        endDate: end,
        status: initialStatus,
      });

      // Buat items jika ada
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        const itemRecords = data.items.map((item) => ({
          flashSaleId: newFlashSale.id,
          productId: item.productId,
          flashPrice: item.flashPrice || 0,
          stock: item.stock || 0,
          sold: 0,
        }));
        await flashSaleItem.bulkCreate(itemRecords);
      }

      // Re-fetch dengan items
      const result = await flashSale.findByPk(newFlashSale.id, {
        include: [
          {
            model: flashSaleItem,
            as: "items",
            include: [
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
            ],
          },
        ],
      });

      return {
        status: true,
        message: "Flash sale created successfully",
        data: result,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  /**
   * List semua flash sale milik outlet tertentu.
   */
  async getByLocationId(locationId, statusFilter) {
    try {
      await syncStatuses();

      const where = { locationId };
      if (statusFilter) {
        where.status = statusFilter;
      }

      const data = await flashSale.findAll({
        where,
        include: [
          {
            model: flashSaleItem,
            as: "items",
            include: [
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
            ],
          },
        ],
        order: [["startDate", "DESC"]],
      });

      return { status: true, message: "Success", data };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  /**
   * Detail satu flash sale.
   */
  async getById(id) {
    try {
      await syncStatuses();

      const data = await flashSale.findByPk(id, {
        include: [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "cityId", "districtId"],
          },
          {
            model: flashSaleItem,
            as: "items",
            include: [
              {
                model: masterProduct,
                as: "product",
                attributes: ["id", "name", "price", "discountPercent", "sku"],
                include: [
                  {
                    model: masterProductImage,
                    as: "images",
                    attributes: ["id", "imageUrl"],
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!data) {
        return { status: false, message: "Flash sale not found", data: null };
      }

      return { status: true, message: "Success", data };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  /**
   * List flash sale yang sedang ACTIVE (untuk customer).
   */
  async getActive(filters = {}) {
    try {
      await syncStatuses();

      const { cityId } = filters;

      const locationWhere = {};
      if (cityId) locationWhere.cityId = cityId;

      const data = await flashSale.findAll({
        where: { status: "ACTIVE" },
        include: [
          {
            model: masterLocation,
            as: "location",
            attributes: ["id", "name", "cityId"],
            where: Object.keys(locationWhere).length > 0 ? locationWhere : undefined,
          },
          {
            model: flashSaleItem,
            as: "items",
            include: [
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
            ],
          },
        ],
        order: [["endDate", "ASC"]],
      });

      return { status: true, message: "Success", data };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  /**
   * Update flash sale (title, waktu, items).
   */
  async update(id, data) {
    try {
      const existing = await flashSale.findByPk(id);
      if (!existing) {
        return { status: false, message: "Flash sale not found", data: null };
      }

      if (data.title !== undefined) existing.title = data.title;
      if (data.startDate !== undefined) existing.startDate = new Date(data.startDate);
      if (data.endDate !== undefined) existing.endDate = new Date(data.endDate);

      // Recalculate status
      const now = new Date();
      const start = existing.startDate;
      const end = existing.endDate;
      if (now < start) existing.status = "UPCOMING";
      else if (now >= start && now < end) existing.status = "ACTIVE";
      else existing.status = "ENDED";

      await existing.save();

      // Jika items dikirim, replace semua items
      if (data.items && Array.isArray(data.items)) {
        await flashSaleItem.destroy({ where: { flashSaleId: id } });

        if (data.items.length > 0) {
          const itemRecords = data.items.map((item) => ({
            flashSaleId: id,
            productId: item.productId,
            flashPrice: item.flashPrice || 0,
            stock: item.stock || 0,
            sold: item.sold || 0,
          }));
          await flashSaleItem.bulkCreate(itemRecords);
        }
      }

      // Re-fetch
      const result = await flashSale.findByPk(id, {
        include: [
          {
            model: flashSaleItem,
            as: "items",
            include: [
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
            ],
          },
        ],
      });

      return {
        status: true,
        message: "Flash sale updated successfully",
        data: result,
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },

  /**
   * Hapus flash sale + semua items.
   */
  async delete(id) {
    try {
      const existing = await flashSale.findByPk(id);
      if (!existing) {
        return { status: false, message: "Flash sale not found", data: null };
      }

      await flashSaleItem.destroy({ where: { flashSaleId: id } });
      await existing.destroy();

      return {
        status: true,
        message: "Flash sale deleted successfully",
        data: { id },
      };
    } catch (error) {
      return { status: false, message: error.message, data: null };
    }
  },
};
