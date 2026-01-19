const response = require("../helpers/response");
const consultation = require("../services/masterConsultation");

module.exports = {
  async getRoomByUser(req, res) {
    const { id } = req.params;
    const result = await consultation.getRoomByUser(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async createRoom(req, res) {
    const result = await consultation.createRoom(req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async assignDoctor(req, res) {
    const { id } = req.params;
    const result = await consultation.assignDoctor(req.body, id);
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
    const user = req.user;
    const result = await consultation.getAllReadyToAssign(user.id, user.roleCode);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
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

  async getMessagesByRoomId(req, res) {
    const { id } = req.params;
    const result = await consultation.getMessagesByRoomId(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async getMediaByRoomId(req, res) {
    const { id } = req.params;
    const result = await consultation.getMediaByRoomId(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  },

  async addPrescription(req, res) {
    const result = await consultation.addPrescription(req.body);
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
};
