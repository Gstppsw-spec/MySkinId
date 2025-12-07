const MasterLocationService = require("../services/masterLocation.service");
const response = require("../helpers/response");

class MasterLocationController {
  async create(req, res) {
    const userId = req.user?.id || null;
    const result = await MasterLocationService.create(
      req.body,
      req.files,
      userId
    );

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async update(req, res) {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const result = await MasterLocationService.update(
      id,
      req.body,
      req.files, // <=== tambah ini
      userId
    );

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async updateStatus(req, res) {
    const { id } = req.params;
    const { isactive } = req.body;
    const userId = req.user?.id || null;

    const result = await MasterLocationService.updateStatus(
      id,
      isactive,
      userId
    );

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async detail(req, res) {
    const { id } = req.params;
    const result = await MasterLocationService.detail(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async list(req, res) {
    const result = await MasterLocationService.list();
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async getByCompanyId(req, res) {
    const data = await MasterLocationService.getByCompanyId(
      req.params.companyId
    );
    return response.success(res, "Success", data);
  }

  async deleteImage(req, res) {
    const { id } = req.params;
    const result = await MasterLocationService.deleteImage(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async getLocationByUserId(req, res) {
    const { id } = req.params;
    const location = await MasterLocationService.getLocationByUserId(id);
    return location.status
      ? response.success(res, location.message, location.data)
      : response.error(res, location.message, null);
  }

  async detailLocationByCustomer(req, res) {
    const { id, customerId } = req.params;
    const location = await MasterLocationService.detailLocationByCustomer(id, customerId);
    
    return location.status
      ? response.success(res, location.message, location.data)
      : response.error(res, location.message, null);
  }

  async listLocationByCustomer(req, res) {
    const { customerId } = req.params;

    const location = await MasterLocationService.listLocationByCustomer(customerId);
    
    return location.status
      ? response.success(res, location.message, location.data)
      : response.error(res, location.message, null);
  }
}

module.exports = new MasterLocationController();
