const {
  relationshipUserCompany,
  masterCompany,
  CompanyVerificationRequest,
  masterProvince,
  masterCity,
  masterDistrict,
  masterSubDistrict,
} = require("../models");

class RelationshipUserCompanyService {
  async getCompanyByUserId(userId) {
    const data = await relationshipUserCompany.findOne({
      where: { userId },
      include: [
        {
          model: masterCompany,
          as: "company",
          include: [
            {
              model: CompanyVerificationRequest,
              as: "verificationRequests", // pastikan ini sesuai alias di association masterCompany
              required: false,
              order: [["createdAt", "DESC"]], // kalau mau urut terbaru
              limit: 1, // ambil hanya request terakhir
            },
          ],
        },
      ],
    });

    return data?.company || null;
  }

  async getAllCompany(pagination = {}, name = null) {
    const { limit, offset } = pagination;
    const { Op } = require("sequelize");
    const where = {};
    if (name) where.name = { [Op.like]: `%${name}%` };

    const { count, rows } = await masterCompany.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });
    return { data: rows, totalCount: count };
  }

  async detailCompany(id) {
    const company = await masterCompany.findByPk(id);
    if (!company) throw new Error("Company tidak ditemukan");
    return company;
  }

  async updateCompany(id, payload) {
    const company = await masterCompany.findByPk(id);
    if (!company) throw new Error("Company tidak ditemukan");

    if (company.isVerified) {
      throw new Error("Data company sudah diverifikasi dan tidak dapat diubah");
    }

    // Resolve region IDs to names if provided in the payload properties (kept as province, city, etc.)
    await this._resolveRegionData(payload);

    await company.update(payload);
    return company;
  }

  async addCompany(payload) {
    // Generate code if not provided
    if (!payload.code && payload.name) {
      payload.code = payload.name.toUpperCase().replace(/\s+/g, "_");
    }

    // Resolve region IDs to names
    await this._resolveRegionData(payload);

    return await masterCompany.create(payload);
  }

  async upsertCompany(payload) {
    // Generate code if not provided
    if (!payload.code && payload.name) {
      payload.code = payload.name.toUpperCase().replace(/\s+/g, "_");
    }

    // Resolve region IDs to names
    await this._resolveRegionData(payload);

    const [company, created] = await masterCompany.findOrCreate({
      where: { name: payload.name },
      defaults: payload,
    });

    if (!created) {
      // Jika sudah ada, check verifikasi lalu update datanya
      if (company.isVerified) {
        throw new Error("Data company sudah diverifikasi dan tidak dapat diubah");
      }
      await company.update(payload);
    }

    // Pastikan relasi ke user terbuat jika userId disediakan
    if (payload.userId) {
      await relationshipUserCompany.findOrCreate({
        where: {
          userId: payload.userId,
          companyId: company.id,
        },
        defaults: {
          userId: payload.userId,
          companyId: company.id,
          isactive: true,
        },
      });
    }

    return company;
  }

  async deleteCompany(id, deletedBy = null) {
    const company = await masterCompany.findByPk(id);
    if (!company) throw new Error("Company tidak ditemukan");

    // If we want to track who deleted it before soft delete
    if (deletedBy) {
      await company.update({ deletedBy });
    }

    return await company.destroy();
  }

  /**
   * Helper to resolve IDs in payload to names and store both.
   * Requirement: payload properties like 'province', 'city' contain UUIDs.
   */
  async _resolveRegionData(payload) {
    // 1. Province
    if (payload.province && this._isUUID(payload.province)) {
      payload.provinceId = payload.province;
      const data = await masterProvince.findByPk(payload.provinceId);
      if (data) payload.province = data.name;
    }

    // 2. City
    if (payload.city && this._isUUID(payload.city)) {
      payload.cityId = payload.city;
      const data = await masterCity.findByPk(payload.cityId);
      if (data) payload.city = data.name;
    }

    // 3. District
    if (payload.district && this._isUUID(payload.district)) {
      payload.districtId = payload.district;
      const data = await masterDistrict.findByPk(payload.districtId);
      if (data) payload.district = data.name;
    }

    // 4. SubDistrict & PostalCode
    if (payload.subDistrict && this._isUUID(payload.subDistrict)) {
      payload.subDistrictId = payload.subDistrict;
      const data = await masterSubDistrict.findByPk(payload.subDistrictId);
      if (data) {
        payload.subDistrict = data.name;
        // Auto-fill postalCode from master data
        if (data.zipCode) payload.postalCode = data.zipCode;
      }
    }
  }

  _isUUID(str) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof str === "string" && regex.test(str);
  }
}

module.exports = new RelationshipUserCompanyService();
