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

//   async updateCompanyStatus(req, res) {
//     try {
//       const { id } = req.params; // companyId
//       const { isactive } = req.body;
//       const updatedBy = req.user?.id || null;

//       const company = await RelationshipUserCompanyService.updateCompanyStatus(
//         id,
//         isactive,
//         updatedBy
//       );
//       return response.success(
//         res,
//         "Status company berhasil diperbarui",
//         company
//       );
//     } catch (error) {
//       console.error(error);
//       return response.serverError(res, error);
//     }
//   }

//   async updateCompanyVerified(req, res) {
//     try {
//       const { id } = req.params; // companyId
//       const { isVerified } = req.body;
//       const updatedBy = req.user?.id || null;

//       const company =
//         await RelationshipUserCompanyService.updateCompanyVerified(
//           id,
//           isVerified,
//           updatedBy
//         );
//       return response.success(
//         res,
//         "Status verifikasi company berhasil diperbarui",
//         company
//       );
//     } catch (error) {
//       console.error(error);
//       return response.serverError(res, error);
//     }
//   }
}

module.exports = new RelationshipUserCompanyController();
