const {
  relationshipUserCompany,
  masterCompany,
  CompanyVerificationRequest,
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

  async getAllCompany() {
    return await masterCompany.findAll();
  }

  async detailCompany(id) {
    const company = await masterCompany.findByPk(id);
    if (!company) throw new Error("Company tidak ditemukan");
    return company;
  }

  async updateCompany(id, payload) {
    const company = await masterCompany.findByPk(id);
    if (!company) throw new Error("Company tidak ditemukan");
    await company.update(payload);
    return company;
  }

  async addCompany(payload) {
    // Generate code if not provided
    if (!payload.code && payload.name) {
      payload.code = payload.name.toUpperCase().replace(/\s+/g, "_");
    }
    return await masterCompany.create(payload);
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
}

module.exports = new RelationshipUserCompanyService();
