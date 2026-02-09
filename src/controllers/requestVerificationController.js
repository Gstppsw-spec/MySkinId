const RequestVerificationService = require("../services/requestVerificationService");

class RequestVerificationController {
    async create(req, res) {
        const data = req.body;
        const role = req.user.role;
        if ((data.refferenceType === "company" || data.refferenceType === "location") && role === "OUTLET_ADMIN") {
            return res.status(401).json({
                status: false,
                message: "Unauthorized",
                data: null,
            });
        }
        const result = await RequestVerificationService.create(data);
        return res.status(result.status ? 201 : 400).json(result);
    }

    async list(req, res) {
        const { status, type } = req.query;
        const result = await RequestVerificationService.list(status, type);
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
