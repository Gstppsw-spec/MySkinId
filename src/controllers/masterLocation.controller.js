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

  async getByCityId(req, res) {
    const { cityId } = req.params;
    const result = await masterLocationService.getByCityId(cityId);
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
    console.log(user, 'ini user');

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

  async getCities(req, res) {
    const result = await masterLocationService.getCities();
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

  // --- PROVINCE ---
  async listProvince(req, res) {
    const { name } = req.query;
    const result = await masterLocationService.listProvince(name);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async detailProvince(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.detailProvince(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async createProvince(req, res) {
    const result = await masterLocationService.createProvince(req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async updateProvince(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.updateProvince(id, req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async deleteProvince(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.deleteProvince(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  // --- CITY ---
  async listCity(req, res) {
    const { provinceId, name } = req.query;
    const result = await masterLocationService.listCity(provinceId, name);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async detailCity(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.detailCity(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async createCity(req, res) {
    const result = await masterLocationService.createCity(req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async updateCity(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.updateCity(id, req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async deleteCity(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.deleteCity(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  // --- DISTRICT ---
  async listDistrict(req, res) {
    const { cityId, name } = req.query;
    const result = await masterLocationService.listDistrict(cityId, name);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async detailDistrict(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.detailDistrict(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async createDistrict(req, res) {
    const result = await masterLocationService.createDistrict(req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async updateDistrict(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.updateDistrict(id, req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async deleteDistrict(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.deleteDistrict(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }
}

module.exports = new masterLocationController();
