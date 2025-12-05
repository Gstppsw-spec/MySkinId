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

  async updateCompany(companyId, payload) {
    const company = await masterCompany.findByPk(companyId);
    if (!company) throw new Error("Company tidak ditemukan");

    await company.update({ ...payload });
    return company;
  }

  //   async updateCompanyStatus(companyId, isactive, updatedBy) {
  //     const company = await masterCompany.findByPk(companyId);
  //     if (!company) throw new Error("Company tidak ditemukan");

  //     await company.update({ isactive, updatedBy });
  //     return company;
  //   }

  //   async updateCompanyVerified(companyId, isVerified, updatedBy) {
  //     const company = await masterCompany.findByPk(companyId);
  //     if (!company) throw new Error("Company tidak ditemukan");

  //     await company.update({
  //       isVerified,
  //       verifiedDate: isVerified ? new Date() : null,
  //       updatedBy,
  //     });
  //     return company;
  //   }
}

module.exports = new RelationshipUserCompanyService();
