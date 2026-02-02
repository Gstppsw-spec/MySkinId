const RequestVerificationService = require("../services/requestVerificationService");

class RequestVerificationController {
    async create(req, res) {
        const data = req.body;
        const result = await RequestVerificationService.create(data);
        return res.status(result.status ? 201 : 400).json(result);
    }

    async list(req, res) {
        const { status } = req.query;
        const result = await RequestVerificationService.list(status);
        return res.status(result.status ? 200 : 400).json(result);
    }

    async detail(req, res) {
        const { id } = req.params;
        const result = await RequestVerificationService.detail(id);
        return res.status(result.status ? 200 : 404).json(result);
    }

    async update(req, res) {
        const { id } = req.params;
        const data = req.body;
        const result = await RequestVerificationService.update(id, data);
        return res.status(result.status ? 200 : 400).json(result);
    }

}

module.exports = new RequestVerificationController();
