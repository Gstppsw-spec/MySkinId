const masterLocationService = require("../services/masterLocation.service");
const response = require("../helpers/response");
const { getPagination, formatPagination } = require("../utils/pagination");

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

  async delete(req, res) {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const result = await masterLocationService.delete(id, userId);

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
    try {
      const user = req.user;
      const { page, pageSize, name } = req.query;
      const pagination = getPagination(page, pageSize);

      const result = await masterLocationService.getLocationByUser({ ...user, name }, pagination);
      if (!result.status) {
        return response.error(res, result.message, null);
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        pagination: formatPagination(result.totalCount, page, pageSize),
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async detailLocationByCustomer(req, res) {
    const { id } = req.params;
    const customerId = req.user?.id || null;
    const { latt, long } = req.query;

    const location = await masterLocationService.detailLocationByCustomer(
      id,
      customerId,
      latt,
      long
    );

    return location.status
      ? response.success(res, location.message, location.data)
      : response.error(res, location.message, null);
  }

  async listLocationByCustomer(req, res) {
    const customerId = req.user?.id || null;
    const { latt, long, name, radius, cityId, sortBy } = req.query;

    const location = await masterLocationService.listLocationByCustomer(
      customerId,
      latt,
      long,
      name,
      radius,
      cityId,
      sortBy
    );

    return location.status
      ? response.success(res, location.message, location.data)
      : response.error(res, location.message, null);
  }

  async getNewArrivalOutlets(req, res) {
    try {
      const { latt, long, page, pageSize } = req.query;
      const pagination = getPagination(page, pageSize);

      const result = await masterLocationService.getNewArrivalOutlets(latt, long, pagination);

      if (!result.status) {
        return response.error(res, result.message, null);
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        pagination: formatPagination(result.totalCount, page, pageSize),
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async getPremiumLocations(req, res) {
    try {
      const { latt, long, page, pageSize } = req.query;
      const pagination = getPagination(page, pageSize);

      const result = await masterLocationService.getPremiumLocations(
        latt,
        long,
        pagination
      );

      if (!result.status) {
        return response.error(res, result.message, null);
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        pagination: formatPagination(result.totalCount, page, pageSize),
      });
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async getMyPremiumStatus(req, res) {
    try {
      const { locationIds } = req.user;
      const { latt, long } = req.query;

      const result = await masterLocationService.getMyPremiumStatus(
        locationIds,
        latt,
        long
      );

      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message, null);
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async removePremium(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || null;
      const result = await masterLocationService.removePremium(id, userId);

      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message, null);
    } catch (error) {
      return response.serverError(res, error);
    }
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

  // --- SUB DISTRICT ---
  async listSubDistrict(req, res) {
    const { districtId, name, cityId } = req.query;
    const result = await masterLocationService.listSubDistrict(districtId, name, cityId);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async detailSubDistrict(req, res) {
    const { id } = req.params;
    const { cityId } = req.query;
    const result = await masterLocationService.detailSubDistrict(id, cityId);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async createSubDistrict(req, res) {
    const result = await masterLocationService.createSubDistrict(req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async updateSubDistrict(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.updateSubDistrict(id, req.body);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  async deleteSubDistrict(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.deleteSubDistrict(id);
    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }

  // --- XENDIT PLATFORM ---
  async createXenditAccount(req, res) {
    try {
      const { locationId } = req.params;
      const { masterLocation } = require("../models");
      const xenditPlatformService = require("../services/xenditPlatform.service");

      const location = await masterLocation.findByPk(locationId);
      if (!location) {
        return response.error(res, "Location not found", null);
      }

      if (location.xenditAccountId) {
        return response.error(res, `Location already has Xendit account: ${location.xenditAccountId}`, null);
      }

      const result = await xenditPlatformService.createSubAccount(location);
      return result.status
        ? response.success(res, result.message, result.data)
        : response.error(res, result.message, null);
    } catch (error) {
      return response.serverError(res, error);
    }
  }

  async setPrimaryImage(req, res) {
    const { id } = req.params;
    const result = await masterLocationService.setPrimaryImage(id);

    return result.status
      ? response.success(res, result.message, result.data)
      : response.error(res, result.message, null);
  }
}

module.exports = new masterLocationController();
