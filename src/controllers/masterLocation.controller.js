const masterLocationService = require("../services/masterLocation.service");
const response = require("../helpers/response");

class masterLocationController {
  async create(req, res) {
    const userId = req.user?.id || null;
    const result = await masterLocationService.create(
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

    const result = await masterLocationService.update(
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

    const result = await masterLocationService.updateStatus(
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
    const result = await masterLocationService.detail(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async list(req, res) {
    const result = await masterLocationService.list();
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async getByCompanyId(req, res) {
    try {
      const result = await masterLocationService.getByCompanyId(
        req.params.companyId
      );
      if (!result.status)
        return response.error(res, result.message, result.data);
      return response.success(res, result.message, result.data);
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async deleteImage(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.deleteImage(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async getLocationByUser(req, res) {
    const user = req.user;
    console.log(user);

    const location = await masterLocationService.getLocationByUser(user);
    return location.status
      ? response.success(res, location.message, location.data)
      : response.error(res, location.message, null);
  }

  async detailLocationByCustomer(req, res) {
    const { id, customerId } = req.params;
    const location = await masterLocationService.detailLocationByCustomer(
      id,
      customerId
    );

    return location.status
      ? response.success(res, location.message, location.data)
      : response.error(res, location.message, null);
  }

  async listLocationByCustomer(req, res) {
    const { customerId } = req.params;

    const location = await masterLocationService.listLocationByCustomer(
      customerId
    );

    return location.status
      ? response.success(res, location.message, location.data)
      : response.error(res, location.message, null);
  }

  async getCityByLatitudeLongitude(req, res) {
    const { latitude, longitude } = req.query;
    const result = await masterLocationService.getCityByLatitudeLongitude(
      latitude,
      longitude
    );
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async getDistrictByLatitudeLongitude(req, res) {
    const { latitude, longitude } = req.query;
    const result = await masterLocationService.getDistrictByLatitudeLongitude(
      latitude,
      longitude
    );
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async injectDataRegion(req, res) {
    // Note: Usually we would have some auth check or API key here, but user asked for public endpoint usage logic.
    // Assuming this is an admin feature, but strict requirement "endpoint that uses axios to inject".
    const result = await masterLocationService.injectDataRegion();

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }
}

module.exports = new masterLocationController();
