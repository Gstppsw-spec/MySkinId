const { Op } = require("sequelize");
const {
  Voucher,
  VoucherItem,
  VoucherUsage,
  VoucherLocation,
  masterCompany,
  masterProduct,
  masterPackage,
  masterService,
  masterLocation,
  masterUser,
  relationshipUserCompany,
  relationshipProductLocation,
  relationshipPackageLocation,
  relationshipServiceLocation,
  sequelize,
} = require("../models");
const balanceService = require("./balance.service");

/**
 * Auto-expire vouchers that have passed their endDate.
 */
async function syncVoucherStatuses() {
  const now = new Date();
  await Voucher.update(
    { status: "EXPIRED" },
    {
      where: {
        status: "ACTIVE",
        endDate: { [Op.lte]: now },
      },
    }
  );
}

module.exports = {
  syncVoucherStatuses,

  /* ═══════════════════════════════════════════════════
     CREATE VOUCHER
     ═══════════════════════════════════════════════════ */
  async create(data, user) {
    const t = await sequelize.transaction();
    try {
      const {
        code,
        title,
        description,
        discountType,
        discountValue,
        minPurchase = 0,
        maxDiscount,
        quota,
        perUserLimit = 1,
        startDate,
        endDate,
        myskinSharePercent,
        mitraSharePercent,
        items, // array of { itemType, itemId }
        locationIds, // array of location UUIDs (optional)
      } = data;

      const { roleCode, id: userId } = user;

      // Validations
      if (!code || !code.trim()) throw new Error("Voucher code is required");
      if (!title || !title.trim()) throw new Error("Voucher title is required");
      if (!discountType || !["PERCENTAGE", "FIXED"].includes(discountType))
        throw new Error("discountType must be PERCENTAGE or FIXED");
      if (!discountValue || parseFloat(discountValue) <= 0)
        throw new Error("discountValue must be greater than 0");
      if (discountType === "PERCENTAGE" && parseFloat(discountValue) > 100)
        throw new Error("Percentage discount cannot exceed 100%");
      if (!startDate || !endDate)
        throw new Error("startDate and endDate are required");
      if (new Date(endDate) <= new Date(startDate))
        throw new Error("endDate must be after startDate");

      // Check duplicate code
      const existing = await Voucher.findOne({
        where: { code: code.toUpperCase() },
        transaction: t,
      });
      if (existing) throw new Error(`Voucher code '${code}' already exists`);

      // Determine company context
      let companyId = null;
      let finalMyskinShare = 0;
      let finalMitraShare = 100;

      if (roleCode === "COMPANY_ADMIN") {
        // Company admin: must have company assignment
        const userCompany = await relationshipUserCompany.findOne({
          where: { userId, isactive: true },
          attributes: ["companyId"],
          transaction: t,
        });
        if (!userCompany)
          throw new Error("Company admin is not assigned to any company");
        companyId = userCompany.companyId;

        // Company admin vouchers: 100% borne by mitra
        finalMyskinShare = 0;
        finalMitraShare = 100;
      } else if (roleCode === "SUPER_ADMIN" || roleCode === "OPERATIONAL_ADMIN") {
        // Super admin can set cost-sharing
        finalMyskinShare = parseFloat(myskinSharePercent || 0);
        finalMitraShare = parseFloat(mitraSharePercent || 100);

        if (finalMyskinShare + finalMitraShare !== 100) {
          throw new Error(
            "myskinSharePercent + mitraSharePercent must equal 100%"
          );
        }

        // Super admin voucher can optionally target a specific company
        companyId = data.companyId || null;
      } else {
        throw new Error("Only SUPER_ADMIN and COMPANY_ADMIN can create vouchers");
      }

      // Validate ownership for items (Company Admin only)
      if (roleCode === "COMPANY_ADMIN" && items && items.length > 0) {
        // Get all location IDs of this company
        const companyLocations = await masterLocation.findAll({
          where: { companyId },
          attributes: ["id"],
          raw: true,
          transaction: t,
        });
        const companyLocationIds = companyLocations.map((l) => l.id);

        for (const item of items) {
          const { itemType, itemId } = item;
          let pivotModel, fkField;

          if (itemType === "PRODUCT") {
            pivotModel = relationshipProductLocation;
            fkField = "productId";
          } else if (itemType === "PACKAGE") {
            pivotModel = relationshipPackageLocation;
            fkField = "packageId";
          } else if (itemType === "SERVICE") {
            pivotModel = relationshipServiceLocation;
            fkField = "serviceId";
          } else {
            throw new Error(`Invalid itemType: ${itemType}`);
          }

          const linked = await pivotModel.findOne({
            where: {
              [fkField]: itemId,
              locationId: { [Op.in]: companyLocationIds },
              isActive: true,
            },
            transaction: t,
          });

          if (!linked) {
            throw new Error(
              `${itemType} ${itemId} does not belong to your company's outlets`
            );
          }
        }
      }

      // Create voucher
      const voucher = await Voucher.create(
        {
          code: code.toUpperCase(),
          title,
          description,
          discountType,
          discountValue,
          minPurchase,
          maxDiscount: maxDiscount || null,
          quota: quota || null,
          perUserLimit,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: "ACTIVE",
          createdByType: roleCode === "COMPANY_ADMIN" ? "COMPANY_ADMIN" : "SUPER_ADMIN",
          createdById: userId,
          companyId,
          myskinSharePercent: finalMyskinShare,
          mitraSharePercent: finalMitraShare,
        },
        { transaction: t }
      );

      // Create voucher items (if any)
      if (items && items.length > 0) {
        const voucherItems = items.map((item) => ({
          voucherId: voucher.id,
          itemType: item.itemType,
          itemId: item.itemId,
        }));
        await VoucherItem.bulkCreate(voucherItems, { transaction: t });
      }

      // Create voucher locations (if any)
      if (locationIds && locationIds.length > 0) {
        const voucherLocs = locationIds.map((locId) => ({
          voucherId: voucher.id,
          locationId: locId,
        }));
        await VoucherLocation.bulkCreate(voucherLocs, { transaction: t });
      }

      await t.commit();

      // Reload with associations
      const result = await Voucher.findByPk(voucher.id, {
        include: [
          { model: VoucherItem, as: "items" },
          { model: VoucherLocation, as: "locations", include: [{ model: masterLocation, as: "location", attributes: ["id", "name"] }] },
          { model: masterCompany, as: "company", attributes: ["id", "name"] },
        ],
      });

      return { status: true, message: "Voucher created successfully", data: result };
    } catch (error) {
      if (t && !t.finished) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  /* ═══════════════════════════════════════════════════
     UPDATE VOUCHER
     ═══════════════════════════════════════════════════ */
  async update(id, data, user) {
    const t = await sequelize.transaction();
    try {
      const { roleCode, id: userId } = user;

      const voucher = await Voucher.findByPk(id, { transaction: t });
      if (!voucher) throw new Error("Voucher not found");

      // Ownership check
      if (roleCode === "COMPANY_ADMIN") {
        const userCompany = await relationshipUserCompany.findOne({
          where: { userId, isactive: true },
          attributes: ["companyId"],
          transaction: t,
        });
        if (!userCompany || voucher.companyId !== userCompany.companyId) {
          throw new Error("You can only update vouchers for your own company");
        }
      }

      // Updatable fields
      const {
        title,
        description,
        discountType,
        discountValue,
        minPurchase,
        maxDiscount,
        quota,
        perUserLimit,
        startDate,
        endDate,
        status,
        myskinSharePercent,
        mitraSharePercent,
        items,
        locationIds,
      } = data;

      if (title !== undefined) voucher.title = title;
      if (description !== undefined) voucher.description = description;
      if (discountType !== undefined) voucher.discountType = discountType;
      if (discountValue !== undefined) voucher.discountValue = discountValue;
      if (minPurchase !== undefined) voucher.minPurchase = minPurchase;
      if (maxDiscount !== undefined) voucher.maxDiscount = maxDiscount;
      if (quota !== undefined) voucher.quota = quota;
      if (perUserLimit !== undefined) voucher.perUserLimit = perUserLimit;
      if (startDate !== undefined) voucher.startDate = new Date(startDate);
      if (endDate !== undefined) voucher.endDate = new Date(endDate);
      if (status !== undefined) voucher.status = status;

      // Only super admin can update cost-sharing
      if (roleCode === "SUPER_ADMIN" || roleCode === "OPERATIONAL_ADMIN") {
        if (myskinSharePercent !== undefined)
          voucher.myskinSharePercent = myskinSharePercent;
        if (mitraSharePercent !== undefined)
          voucher.mitraSharePercent = mitraSharePercent;
      }

      await voucher.save({ transaction: t });

      // Update items if provided
      if (items !== undefined) {
        await VoucherItem.destroy({
          where: { voucherId: id },
          transaction: t,
        });

        if (items && items.length > 0) {
          const voucherItems = items.map((item) => ({
            voucherId: id,
            itemType: item.itemType,
            itemId: item.itemId,
          }));
          await VoucherItem.bulkCreate(voucherItems, { transaction: t });
        }
      }

      // Update locations if provided
      if (locationIds !== undefined) {
        await VoucherLocation.destroy({
          where: { voucherId: id },
          transaction: t,
        });

        if (locationIds && locationIds.length > 0) {
          const voucherLocs = locationIds.map((locId) => ({
            voucherId: id,
            locationId: locId,
          }));
          await VoucherLocation.bulkCreate(voucherLocs, { transaction: t });
        }
      }

      await t.commit();

      const result = await Voucher.findByPk(id, {
        include: [
          { model: VoucherItem, as: "items" },
          { model: VoucherLocation, as: "locations", include: [{ model: masterLocation, as: "location", attributes: ["id", "name"] }] },
          { model: masterCompany, as: "company", attributes: ["id", "name"] },
        ],
      });

      return { status: true, message: "Voucher updated successfully", data: result };
    } catch (error) {
      if (t && !t.finished) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  /* ═══════════════════════════════════════════════════
     DELETE (DEACTIVATE) VOUCHER
     ═══════════════════════════════════════════════════ */
  async delete(id, user) {
    try {
      const { roleCode, id: userId } = user;

      const voucher = await Voucher.findByPk(id);
      if (!voucher) return { status: false, message: "Voucher not found" };

      // Ownership check
      if (roleCode === "COMPANY_ADMIN") {
        const userCompany = await relationshipUserCompany.findOne({
          where: { userId, isactive: true },
          attributes: ["companyId"],
        });
        if (!userCompany || voucher.companyId !== userCompany.companyId) {
          return { status: false, message: "You can only delete vouchers for your own company" };
        }
      }

      voucher.status = "INACTIVE";
      await voucher.save();

      return { status: true, message: "Voucher deactivated successfully", data: { id } };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /* ═══════════════════════════════════════════════════
     GET ALL VOUCHERS (role-scoped)
     ═══════════════════════════════════════════════════ */
  async getAll(filters = {}, pagination = {}, user = {}) {
    try {
      await syncVoucherStatuses();

      const { roleCode, id: userId } = user;
      const { limit, offset } = pagination;
      const { status, search } = filters;

      const where = {};

      // Status filter
      if (status) where.status = status;

      // Search by code or title
      if (search) {
        where[Op.or] = [
          { code: { [Op.like]: `%${search}%` } },
          { title: { [Op.like]: `%${search}%` } },
        ];
      }

      // Scope by role
      if (roleCode === "COMPANY_ADMIN") {
        const userCompany = await relationshipUserCompany.findOne({
          where: { userId, isactive: true },
          attributes: ["companyId"],
        });
        if (userCompany) {
          // Show company's own vouchers + super admin vouchers that target this company (or global)
          where[Op.or] = [
            ...(where[Op.or] || []),
            { companyId: userCompany.companyId },
            {
              createdByType: "SUPER_ADMIN",
              [Op.or]: [
                { companyId: null }, // global super admin vouchers
                { companyId: userCompany.companyId }, // targeted to this company
              ],
            },
          ];
          // Override the search `or` if both exist
          if (search) {
            const searchCondition = [
              { code: { [Op.like]: `%${search}%` } },
              { title: { [Op.like]: `%${search}%` } },
            ];
            const scopeCondition = [
              { companyId: userCompany.companyId },
              {
                createdByType: "SUPER_ADMIN",
                [Op.or]: [
                  { companyId: null },
                  { companyId: userCompany.companyId },
                ],
              },
            ];
            delete where[Op.or];
            where[Op.and] = [
              { [Op.or]: searchCondition },
              { [Op.or]: scopeCondition },
            ];
          } else {
            // Just scope
            const scopeCondition = [
              { companyId: userCompany.companyId },
              {
                createdByType: "SUPER_ADMIN",
                [Op.or]: [
                  { companyId: null },
                  { companyId: userCompany.companyId },
                ],
              },
            ];
            delete where[Op.or];
            where[Op.or] = scopeCondition;
          }
        } else {
          return { status: true, message: "No company assigned", data: [], totalCount: 0 };
        }
      }
      // SUPER_ADMIN / OPERATIONAL_ADMIN see all

      const { count, rows: data } = await Voucher.findAndCountAll({
        where,
        include: [
          {
            model: VoucherItem,
            as: "items",
            include: [
              { model: masterProduct, as: "product", attributes: ["id", "name", "price"] },
              { model: masterPackage, as: "package", attributes: ["id", "name", "price"] },
              { model: masterService, as: "service", attributes: ["id", "name", "price"] },
            ],
          },
          { model: VoucherLocation, as: "locations", include: [{ model: masterLocation, as: "location", attributes: ["id", "name"] }] },
          { model: masterCompany, as: "company", attributes: ["id", "name"] },
          { model: masterUser, as: "creator", attributes: ["id", "name"] },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
        distinct: true,
      });

      return { status: true, message: "Success", data, totalCount: count };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /* ═══════════════════════════════════════════════════
     GET VOUCHER BY ID
     ═══════════════════════════════════════════════════ */
  async getById(id) {
    try {
      await syncVoucherStatuses();

      const data = await Voucher.findByPk(id, {
        include: [
          {
            model: VoucherItem,
            as: "items",
            include: [
              { model: masterProduct, as: "product", attributes: ["id", "name", "price"] },
              { model: masterPackage, as: "package", attributes: ["id", "name", "price"] },
              { model: masterService, as: "service", attributes: ["id", "name", "price"] },
            ],
          },
          { model: VoucherLocation, as: "locations", include: [{ model: masterLocation, as: "location", attributes: ["id", "name"] }] },
          { model: masterCompany, as: "company", attributes: ["id", "name"] },
          { model: masterUser, as: "creator", attributes: ["id", "name"] },
          {
            model: VoucherUsage,
            as: "usages",
            attributes: ["id", "customerId", "orderId", "discountAmount", "myskinSubsidy", "mitraSubsidy", "createdAt"],
          },
        ],
      });

      if (!data) return { status: false, message: "Voucher not found" };

      return { status: true, message: "Success", data };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /* ═══════════════════════════════════════════════════
     VALIDATE VOUCHER (for Customer)
     Checks if a voucher code is valid for the customer and cart items.
     Does NOT consume the voucher.
     ═══════════════════════════════════════════════════ */
  async validateVoucher(code, customerId, cartItems = []) {
    try {
      await syncVoucherStatuses();

      const voucher = await Voucher.findOne({
        where: { code: code.toUpperCase(), status: "ACTIVE" },
        include: [
          { model: VoucherItem, as: "items" },
          { model: VoucherLocation, as: "locations" },
        ],
      });

      if (!voucher)
        return { status: false, message: "Voucher code not found or inactive" };

      const now = new Date();
      // Check date range
      if (now < voucher.startDate || now > voucher.endDate) {
        return { status: false, message: "Voucher is not within the valid period" };
      }

      // Check quota
      if (voucher.quota !== null && voucher.usedCount >= voucher.quota) {
        return { status: false, message: "Voucher has reached its usage limit" };
      }

      // Check per-user limit
      const userUsageCount = await VoucherUsage.count({
        where: { voucherId: voucher.id, customerId },
      });
      if (userUsageCount >= voucher.perUserLimit) {
        return { status: false, message: "You have reached the maximum usage limit for this voucher" };
      }

      // Check location eligibility (if voucherLocations exist)
      if (voucher.locations && voucher.locations.length > 0) {
        const allowedLocationIds = voucher.locations.map((vl) => vl.locationId);
        const locationFilteredItems = cartItems.filter((ci) => {
          const itemLocationId = ci.locationId;
          return itemLocationId && allowedLocationIds.includes(itemLocationId);
        });

        if (locationFilteredItems.length === 0) {
          return {
            status: false,
            message: "This voucher is not valid for the selected outlet location",
          };
        }
      }

      // Check item eligibility (if voucherItems exist)
      let eligibleItems = cartItems;
      if (voucher.items && voucher.items.length > 0) {
        const voucherItemMap = voucher.items.map((vi) => `${vi.itemType}:${vi.itemId}`);
        eligibleItems = cartItems.filter((ci) => {
          const itemTypeUpper = (ci.itemType || ci.referenceType || "").toUpperCase();
          return voucherItemMap.includes(`${itemTypeUpper}:${ci.itemId}`);
        });

        if (eligibleItems.length === 0) {
          return {
            status: false,
            message: "None of your cart items are eligible for this voucher",
          };
        }
      }

      // Calculate potential discount
      const eligibleSubtotal = eligibleItems.reduce(
        (sum, item) => sum + parseFloat(item.totalPrice || 0),
        0
      );

      // Check minimum purchase
      if (eligibleSubtotal < parseFloat(voucher.minPurchase || 0)) {
        return {
          status: false,
          message: `Minimum purchase of Rp${parseFloat(voucher.minPurchase).toLocaleString("id-ID")} is required`,
        };
      }

      let discountAmount = 0;
      if (voucher.discountType === "PERCENTAGE") {
        discountAmount = (eligibleSubtotal * parseFloat(voucher.discountValue)) / 100;
        if (voucher.maxDiscount && discountAmount > parseFloat(voucher.maxDiscount)) {
          discountAmount = parseFloat(voucher.maxDiscount);
        }
      } else {
        discountAmount = parseFloat(voucher.discountValue);
      }

      // Discount cannot exceed subtotal
      if (discountAmount > eligibleSubtotal) {
        discountAmount = eligibleSubtotal;
      }

      return {
        status: true,
        message: "Voucher is valid",
        data: {
          voucherId: voucher.id,
          code: voucher.code,
          title: voucher.title,
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
          discountAmount: Math.round(discountAmount),
          eligibleItemCount: eligibleItems.length,
          myskinSharePercent: voucher.myskinSharePercent,
          mitraSharePercent: voucher.mitraSharePercent,
        },
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },

  /* ═══════════════════════════════════════════════════
     APPLY VOUCHER (called from checkout, within a transaction)
     Records voucher usage and increments usedCount.
     Does NOT credit ads balance yet — that happens on payment PAID.
     ═══════════════════════════════════════════════════ */
  async applyVoucher(code, customerId, orderId, discountAmount, externalTransaction = null) {
    const t = externalTransaction || (await sequelize.transaction());
    try {
      const voucher = await Voucher.findOne({
        where: { code: code.toUpperCase() },
        transaction: t,
        lock: true,
      });

      if (!voucher) throw new Error("Voucher not found");

      // Calculate cost-sharing
      const myskinSubsidy = Math.round(
        (discountAmount * parseFloat(voucher.myskinSharePercent)) / 100
      );
      const mitraSubsidy = discountAmount - myskinSubsidy;

      // Create usage record
      await VoucherUsage.create(
        {
          voucherId: voucher.id,
          customerId,
          orderId,
          discountAmount,
          myskinSubsidy,
          mitraSubsidy,
        },
        { transaction: t }
      );

      // Increment used count
      await voucher.increment("usedCount", { transaction: t });

      if (!externalTransaction) await t.commit();

      return {
        status: true,
        message: "Voucher applied successfully",
        data: { discountAmount, myskinSubsidy, mitraSubsidy, voucherId: voucher.id },
      };
    } catch (error) {
      if (!externalTransaction && t && !t.finished) await t.rollback();
      return { status: false, message: error.message };
    }
  },

  /* ═══════════════════════════════════════════════════
     CREDIT MYSKIN SUBSIDY TO ADS BALANCE
     Called when payment status becomes PAID.
     ═══════════════════════════════════════════════════ */
  async creditVoucherSubsidy(orderId) {
    try {
      const usage = await VoucherUsage.findOne({
        where: { orderId },
        include: [{ model: Voucher, as: "voucher" }],
      });

      if (!usage) return { status: true, message: "No voucher usage for this order" };
      if (parseFloat(usage.myskinSubsidy) <= 0) {
        return { status: true, message: "No MySkin subsidy to credit" };
      }

      // Determine company to credit
      const voucher = usage.voucher;
      let targetCompanyId = voucher.companyId;

      if (!targetCompanyId) {
        // Global super admin voucher: need to determine company from order's transaction location
        const orderRecord = await sequelize.models.order.findByPk(orderId, {
          include: [
            {
              model: sequelize.models.transaction,
              as: "transactions",
              attributes: ["locationId"],
              limit: 1,
            },
          ],
        });

        if (orderRecord && orderRecord.transactions && orderRecord.transactions.length > 0) {
          const locationId = orderRecord.transactions[0].locationId;
          if (locationId) {
            const location = await masterLocation.findByPk(locationId, {
              attributes: ["companyId"],
            });
            if (location) targetCompanyId = location.companyId;
          }
        }
      }

      if (!targetCompanyId) {
        console.warn(`[VoucherSubsidy] Cannot determine company for order ${orderId}`);
        return { status: false, message: "Cannot determine target company for subsidy" };
      }

      // Credit ads balance
      const result = await balanceService.addBalance(
        targetCompanyId,
        parseFloat(usage.myskinSubsidy),
        "TOPUP",
        orderId,
        `Voucher subsidy from MySkin (voucher: ${voucher.code}, order: ${orderId})`
      );

      return result;
    } catch (error) {
      console.error("[VoucherSubsidy] Error:", error.message);
      return { status: false, message: error.message };
    }
  },

  /* ═══════════════════════════════════════════════════
     GET AVAILABLE VOUCHERS FOR CUSTOMER
     Public endpoint — shows active vouchers customer can use
     ═══════════════════════════════════════════════════ */
  async getAvailableForCustomer(customerId, pagination = {}) {
    try {
      await syncVoucherStatuses();

      const { limit, offset } = pagination;
      const now = new Date();

      const { count, rows: data } = await Voucher.findAndCountAll({
        where: {
          status: "ACTIVE",
          startDate: { [Op.lte]: now },
          endDate: { [Op.gte]: now },
          [Op.or]: [
            { quota: null },
            sequelize.literal('"usedCount" < "quota"'),
          ],
        },
        attributes: [
          "id", "code", "title", "description",
          "discountType", "discountValue", "minPurchase", "maxDiscount",
          "startDate", "endDate",
        ],
        include: [
          {
            model: VoucherItem,
            as: "items",
            include: [
              { model: masterProduct, as: "product", attributes: ["id", "name"] },
              { model: masterPackage, as: "package", attributes: ["id", "name"] },
              { model: masterService, as: "service", attributes: ["id", "name"] },
            ],
          },
          { model: VoucherLocation, as: "locations", include: [{ model: masterLocation, as: "location", attributes: ["id", "name"] }] },
        ],
        order: [["endDate", "ASC"]],
        limit,
        offset,
        distinct: true,
      });

      return { status: true, message: "Success", data, totalCount: count };
    } catch (error) {
      return { status: false, message: error.message };
    }
  },
};
