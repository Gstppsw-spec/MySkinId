const RequestVerificationService = require("../services/requestVerificationService");
const { getPagination, formatPagination } = require("../utils/pagination");

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
        const { status, type, page, pageSize } = req.query;
        const pagination = getPagination(page, pageSize);

        const result = await RequestVerificationService.list(status, type, pagination);

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
