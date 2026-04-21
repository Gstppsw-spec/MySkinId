const response = require("../helpers/response");
const consultation = require("../services/masterConsultation");
const quotaService = require("../services/quota.service");
const transactionOrder = require("../services/transactionOrder");
const { formatPagination } = require("../utils/pagination");

module.exports = {
  async getRoomByUserDoctor(req, res) {
    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { status } = req.query;

    const result = await consultation.getRoomByUser(user.id, {
      page,
      pageSize,
      status,
    });

    if (!result.status) {
      return response.error(res, result.message, null);
    }

    const { totalItems, rows } = result.data;

    return res.status(200).json({
      success: true,
      message: result.message,
      data: rows,
      pagination: formatPagination(totalItems, page, pageSize),
    });
  },

  async getRoomByUser(req, res) {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { status } = req.query;

    const result = await consultation.getRoomByUser(id, {
      page,
      pageSize,
      status,
    });

    if (!result.status) {
      return response.error(res, result.message, null);
    }

    const { totalItems, rows } = result.data;

    return res.status(200).json({
      success: true,
      message: result.message,
      data: rows,
      pagination: formatPagination(totalItems, page, pageSize),
    });
  },

  async createRoom(req, res) {
    const data = {
      ...(req.body || {}),
      customerId: req.body?.customerId || req.user?.id,
    };
    const result = await consultation.createRoom(data);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async assignDoctor(req, res) {
    const { id } = req.params;
    const user = req.user;
    const result = await consultation.assignDoctor(user, id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async closeRoom(req, res) {
    const { id } = req.params;
    const result = await consultation.closeRoom(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async readyToAssign(req, res) {
    try {
      const user = req.user;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;

      const result = await consultation.getAllReadyToAssign(
        user.id,
        user.roleCode,
        page,
        pageSize,
      );

      if (!result.status) {
        return res.status(400).json({ success: false, message: result.message });
      }

      const { totalItems, rows } = result.data;

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: formatPagination(totalItems, page, pageSize),
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getByRoomId(req, res) {
    const { id } = req.params;
    const result = await consultation.getByRoomId(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async addMessage(req, res) {
    const result = await consultation.addMessage(req.body, req.files);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async readMessage(req, res) {
    const { id } = req.params;
    const result = await consultation.setMessageRead(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getMessagesByRoomId(req, res) {
    try {
      const { id } = req.params;
      const { cursor, limit } = req.query;

      const result = await consultation.getMessagesByRoomId({
        roomId: id,
        cursor: cursor || null,
        limit: limit ? parseInt(limit) : 20,
      });

      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message, null);
    } catch (error) {
      return response.error(res, error.message, null);
    }
  },

  async getMediaByRoomId(req, res) {
    const { id } = req.params;
    const result = await consultation.getMediaByRoomId(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async updateLocation(req, res) {
    const { id } = req.params;
    const locationId = req.body.locationId;
    const result = await consultation.updateLocation(locationId, id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async updateLatLng(req, res) {
    const { id } = req.params;
    const { lat, lng } = req.body;
    const result = await consultation.updateLatLng(lat, lng, id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async addPrescription(req, res) {
    const { id } = req.params;
    const result = await consultation.addPrescription(req.body, id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getPrescriptionByRoomId(req, res) {
    const { id } = req.params;
    const result = await consultation.getPrescriptionByRoomId(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getAllPrescriptionByOutlet(req, res) {
    const { id } = req.params;
    const { search, productCategoryId, packageCategoryId } = req.query;

    const filters = {
      search,
      productCategoryId,
      packageCategoryId,
    };

    const result = await consultation.getAllPrescriptionByOutlet(id, filters);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async deletePrescriptionsByRoomId(req, res) {
    const { roomId } = req.params;
    const result = await consultation.deletePrescriptionsByRoomId(roomId);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async deletePrescription(req, res) {
    const { id } = req.params;
    const result = await consultation.deletePrescription(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async addRecommendation(req, res) {
    const { id } = req.params;
    const result = await consultation.addRecommendation(id, req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getRecommendationDetail(req, res) {
    const { id } = req.params;
    const result = await consultation.getRecommendationDetail(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getRecommendations(req, res) {
    const { id } = req.params;
    const { sortBy } = req.query;
    const result = await consultation.getRecommendations(id, sortBy);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getQuota(req, res) {
    const customerId = req.user.id;
    const result = await quotaService.getUserQuota(customerId);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async buyQuota(req, res) {
    const customerId = req.user.id;
    const result = await transactionOrder.buyConsultationQuota(req.body, customerId);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getQuotaConfig(req, res) {
    const result = await quotaService.getQuotaConfig();
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async updateQuotaConfig(req, res) {
    const result = await quotaService.updateQuotaConfig(req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },
};
