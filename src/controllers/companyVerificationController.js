const companyVerificationService = require("../services/companyVerificationService");

class CompanyVerificationController {
  async create(req, res) {
    const data = req.body;
    const result = await companyVerificationService.create(data);
    return res.status(result.status ? 201 : 400).json(result);
  }

  async list(req, res) {
    const { status } = req.query;
    const result = await companyVerificationService.list(status);
    return res.status(result.status ? 200 : 400).json(result);
  }

  async detail(req, res) {
    const { id } = req.params;
    const result = await companyVerificationService.detail(id);
    return res.status(result.status ? 200 : 404).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    const data = req.body;
    const result = await companyVerificationService.update(id, data);
    return res.status(result.status ? 200 : 400).json(result);
  }

  async delete(req, res) {
    const { id } = req.params;
    const result = await companyVerificationService.delete(id);
    return res.status(result.status ? 200 : 404).json(result);
  }
}

module.exports = new CompanyVerificationController();
