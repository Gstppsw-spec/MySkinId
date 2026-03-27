const companyVerificationService = require("../services/companyVerificationService");
const { getPagination, formatPagination } = require("../utils/pagination");

class CompanyVerificationController {
  async create(req, res) {
    const data = req.body;
    const result = await companyVerificationService.create(data);
    return res.status(result.status ? 201 : 400).json(result);
  }

  async list(req, res) {
    const { status, page, pageSize } = req.query;
    const pagination = getPagination(page, pageSize);

    const result = await companyVerificationService.list(status, pagination);

    if (!result.status) {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      pagination: formatPagination(result.totalCount, page, pageSize),
    });
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
