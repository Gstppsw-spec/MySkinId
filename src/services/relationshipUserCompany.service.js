const {
  relationshipUserCompany,
  masterCompany,
  CompanyVerificationRequest,
  masterProvince,
  masterCity,
  masterDistrict,
  masterSubDistrict,
  requestVerification,
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
              as: "verificationRequests",
              required: false,
              order: [["createdAt", "DESC"]],
              limit: 1,
            },
            {
              model: requestVerification,
              as: "verificationStatus",
              attributes: ["status"],
              required: false,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!data?.company) return null;

    const plain = data.company.get({ plain: true });
    return {
      ...plain,
      statusVerification: plain.verificationStatus?.status || null,
    };
  }

  async getAllCompany(pagination = {}, name = null, userId = null, roleCode = null) {
    const { limit, offset } = pagination;
    const { Op } = require("sequelize");
    const where = {};
    if (name) where.name = { [Op.like]: `%${name}%` };

    const include = [];
    if (roleCode && roleCode !== "SUPER_ADMIN") {
      include.push({
        model: relationshipUserCompany,
        as: "userLinks",
        where: { userId },
        required: true,
      });
    }

    const { count, rows } = await masterCompany.findAndCountAll({
      where,
      limit,
      offset,
      include,
      order: [["createdAt", "DESC"]],
      distinct: true, // Untuk memastikan count benar saat ada join
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

    // Filter out association fields to avoid validation errors
    const allowedFields = Object.keys(masterCompany.rawAttributes);
    const cleanPayload = {};
    Object.keys(payload).forEach((key) => {
      if (allowedFields.includes(key)) {
        cleanPayload[key] = payload[key];
      }
    });

    await company.update(cleanPayload);
    return company;
  }

  async addCompany(payload) {
    // Generate code if not provided
    if (!payload.code && payload.name) {
      payload.code = payload.name.toUpperCase().replace(/\s+/g, "_");
    }

    // Resolve region IDs to names
    await this._resolveRegionData(payload);

    // Filter out association fields to avoid validation errors
    const allowedFields = Object.keys(masterCompany.rawAttributes);
    const cleanPayload = {};
    Object.keys(payload).forEach((key) => {
      if (allowedFields.includes(key)) {
        cleanPayload[key] = payload[key];
      }
    });

    return await masterCompany.create(cleanPayload);
  }

  async upsertCompany(payload) {
    // Generate code if not provided
    if (!payload.code && payload.name) {
      payload.code = payload.name.toUpperCase().replace(/\s+/g, "_");
    }

    // Resolve region IDs to names
    await this._resolveRegionData(payload);

    // Filter out association fields to avoid validation errors
    const allowedFields = Object.keys(masterCompany.rawAttributes);
    const cleanPayload = {};
    Object.keys(payload).forEach((key) => {
      if (allowedFields.includes(key)) {
        cleanPayload[key] = payload[key];
      }
    });

    // Coba cari data yang sudah ada berdasarkan PRIORITAS:
    // 1. Apakah user ini sudah terhubung dengan suatu perusahaan? (Ownership focus)
    // 2. Berdasarkan ID di payload
    // 3. Berdasarkan Nama di payload
    
    let company;
    let existingLink = null;

    if (payload.userId) {
      existingLink = await relationshipUserCompany.findOne({
        where: { userId: payload.userId },
        order: [["createdAt", "DESC"]]
      });
      if (existingLink) {
        company = await masterCompany.findByPk(existingLink.companyId);
        console.log(`[UPSERT] Found existing company by user link: ${company?.id}`);
      }
    }

    if (!company && cleanPayload.id) {
      company = await masterCompany.findByPk(cleanPayload.id);
      console.log(`[UPSERT] Found existing company by ID: ${company?.id}`);
    }

    if (!company) {
      company = await masterCompany.findOne({
        where: { name: cleanPayload.name }
      });
      if (company) console.log(`[UPSERT] Found existing company by Name: ${company?.id}`);
    }

    if (company) {
      // Jika sudah ada, check verifikasi lalu update datanya
      if (company.isVerified) {
        throw new Error("Data company sudah diverifikasi dan tidak dapat diubah");
      }
      await company.update(cleanPayload);
    } else {
      // Jika tidak ada, buat baru
      company = await masterCompany.create(cleanPayload);
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
