const MasterRoleService = require("../services/masterRoleService");

class MasterRoleController {
    async create(req, res) {
        const data = req.body;
        const result = await MasterRoleService.create(data);
        return res.status(result.status ? 201 : 400).json(result);
    }

    async list(req, res) {
        const result = await MasterRoleService.list();
        return res.status(result.status ? 200 : 400).json(result);
    }

    async detail(req, res) {
        const { id } = req.params;
        const result = await MasterRoleService.detail(id);
        return res.status(result.status ? 200 : 404).json(result);
    }

    async update(req, res) {
        const { id } = req.params;
        const data = req.body;
        const result = await MasterRoleService.update(id, data);
        return res.status(result.status ? 200 : 400).json(result);
    }

    async delete(req, res) {
        const { id } = req.params;
        const result = await MasterRoleService.delete(id);
        return res.status(result.status ? 200 : 400).json(result);
    }
}

module.exports = new MasterRoleController();