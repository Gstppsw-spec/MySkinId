const RelationshipUserCompanyService = require("../services/relationshipUserCompany.service");
const response = require("../helpers/response");

class RelationshipUserCompanyController {
  async getCompanyByUserId(req, res) {
    try {
      const { userId } = req.params;
      const company = await RelationshipUserCompanyService.getCompanyByUserId(
        userId
      );

      if (!company)
        return response.error(
          res,
          "Company tidak ditemukan untuk user ini",
          null,
          404
        );

      return response.success(res, "Company ditemukan", company);
    } catch (error) {
      console.error(error);
      return response.serverError(res, error);
    }
  }

  async updateCompany(req, res) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const company = await RelationshipUserCompanyService.updateCompany(
        id,
        payload
      );
      return response.success(res, "Company berhasil diperbarui", company);
    } catch (error) {
      console.error(error);
      return response.serverError(res, error);
    }
  }

  async detailCompany(req, res) {
    try {
      const { id } = req.params;
      const company = await RelationshipUserCompanyService.detailCompany(id);
      return response.success(res, "Detail company ditemukan", company);
    } catch (error) {
      console.error(error);
      return response.serverError(res, error);
    }
  }

  async getAllCompany(req, res) {
    try {
      const data = await RelationshipUserCompanyService.getAllCompany();
      return response.success(res, "Data relationship user company", data);
    } catch (error) {
      console.error(error);
      return response.serverError(res, error);
    }
  }

  async addCompany(req, res) {
    try {
      const payload = {
        ...req.body,
        createdBy: req.user?.id || null,
        updatedBy: req.user?.id || null,
      };

      if (!payload.name) {
        return response.error(res, "Nama company harus diisi", null, 400);
      }

      const data = await RelationshipUserCompanyService.addCompany(payload);
      return response.success(res, "Company berhasil ditambahkan", data);
    } catch (error) {
      console.error(error);
      return response.serverError(res, error);
    }
  }

  async deleteCompany(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || null;
      await RelationshipUserCompanyService.deleteCompany(id, userId);
      return response.success(res, "Company berhasil dihapus", null);
    } catch (error) {
      console.error(error);
      return response.serverError(res, error);
    }
  }
}

module.exports = new RelationshipUserCompanyController();
