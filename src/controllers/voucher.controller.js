const response = require("../helpers/response");
const voucherService = require("../services/voucher.service");
const { getPagination, formatPagination } = require("../utils/pagination");

module.exports = {
  /* ═══════════════════════════════════════════════════
     ADMIN: Create Voucher
     ═══════════════════════════════════════════════════ */
  async create(req, res) {
    try {
      const result = await voucherService.create(req.body, req.user);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /* ═══════════════════════════════════════════════════
     ADMIN: Get All Vouchers
     ═══════════════════════════════════════════════════ */
  async getAll(req, res) {
    try {
      const { page, pageSize, status, search } = req.query;
      const pagination = getPagination(page, pageSize);
      const filters = { status, search };

      const result = await voucherService.getAll(filters, pagination, req.user);
      if (!result.status) return response.error(res, result.message);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        pagination: formatPagination(result.totalCount, page, pageSize),
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /* ═══════════════════════════════════════════════════
     ADMIN: Get Voucher Detail
     ═══════════════════════════════════════════════════ */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await voucherService.getById(id);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /* ═══════════════════════════════════════════════════
     ADMIN: Update Voucher
     ═══════════════════════════════════════════════════ */
  async update(req, res) {
    try {
      const { id } = req.params;
      const result = await voucherService.update(id, req.body, req.user);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /* ═══════════════════════════════════════════════════
     ADMIN: Delete (Deactivate) Voucher
     ═══════════════════════════════════════════════════ */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await voucherService.delete(id, req.user);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /* ═══════════════════════════════════════════════════
     CUSTOMER: Validate Voucher Code
     ═══════════════════════════════════════════════════ */
  async validate(req, res) {
    try {
      const { code, cartItems, itemId } = req.body;
      if (!code) return response.error(res, "Voucher code is required");

      // customerId comes from customer auth middleware
      const customerId = req.user?.id || req.customer?.id;
      if (!customerId) return response.error(res, "Customer ID is required", null, 401);

      const result = await voucherService.validateVoucher(
        code,
        customerId,
        cartItems || [],
        itemId
      );
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /* ═══════════════════════════════════════════════════
     CUSTOMER: Get Available Vouchers
     ═══════════════════════════════════════════════════ */
  async getAvailable(req, res) {
    try {
      const { page, pageSize } = req.query;
      const pagination = getPagination(page, pageSize);
      const customerId = req.user?.id || req.customer?.id;

      const result = await voucherService.getAvailableForCustomer(customerId, pagination);
      if (!result.status) return response.error(res, result.message);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        pagination: formatPagination(result.totalCount, page, pageSize),
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /* ═══════════════════════════════════════════════════
     CUSTOMER: Get Vouchers for a Specific Item + Location
     ═══════════════════════════════════════════════════ */
  async getForItem(req, res) {
    try {
      const { itemType, itemId, locationId, price } = req.query;
      const customerId = req.user?.id || req.customer?.id || null;

      const result = await voucherService.getVouchersForItem({
        itemType,
        itemId,
        locationId,
        customerId,
        price: price ? parseFloat(price) : null,
      });
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /* ═══════════════════════════════════════════════════
     CUSTOMER: Claim Voucher
     ═══════════════════════════════════════════════════ */
  async claim(req, res) {
    try {
      const { voucherId } = req.body;
      if (!voucherId) return response.error(res, "voucherId is required");

      const customerId = req.user?.id || req.customer?.id;
      if (!customerId) return response.error(res, "Customer ID is required", null, 401);

      const result = await voucherService.claimVoucher(voucherId, customerId);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /* ═══════════════════════════════════════════════════
     CUSTOMER: Get My Claimed Vouchers
     ═══════════════════════════════════════════════════ */
  async getMyVouchers(req, res) {
    try {
      const { page, pageSize, status } = req.query;
      const pagination = getPagination(page, pageSize);
      const customerId = req.user?.id || req.customer?.id;
      if (!customerId) return response.error(res, "Customer ID is required", null, 401);

      const result = await voucherService.getMyVouchers(customerId, { status }, pagination);
      if (!result.status) return response.error(res, result.message);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        pagination: formatPagination(result.totalCount, page, pageSize),
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /* ═══════════════════════════════════════════════════
     ADMIN: Participate in Voucher Template
     ═══════════════════════════════════════════════════ */
  async participate(req, res) {
    try {
      const result = await voucherService.participateInVoucher(req.body, req.user);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },

  /* ═══════════════════════════════════════════════════
     CUSTOMER: Get Voucher Detail
     Shows applicable outlets & items for a voucher
     ═══════════════════════════════════════════════════ */
  async getCustomerDetail(req, res) {
    try {
      const { id } = req.params;
      const customerId = req.user?.id || req.customer?.id || null;

      const result = await voucherService.getCustomerVoucherDetail(id, customerId);
      if (!result.status) return response.error(res, result.message);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  },
};

