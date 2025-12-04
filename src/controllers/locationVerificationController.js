const LocationVerificationService = require("../services/locationVerificationService");

class LocationVerificationController {
  async create(req, res) {

    const data = req.body;
    const result = await LocationVerificationService.create(data);
    return res.status(result.status ? 201 : 400).json(result);
  }

  async list(req, res) {
    const { status } = req.query;
    const result = await LocationVerificationService.list(status);
    return res.status(result.status ? 200 : 400).json(result);
  }

  async detail(req, res) {
    const { id } = req.params;
    const result = await LocationVerificationService.detail(id);
    return res.status(result.status ? 200 : 404).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    const data = req.body;
    const result = await LocationVerificationService.update(id, data);
    return res.status(result.status ? 200 : 400).json(result);
  }
}

module.exports = new LocationVerificationController();
