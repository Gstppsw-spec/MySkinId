const response = require("../helpers/response");
const questionnaireService = require("../services/masterQuestionnaire");

module.exports = {
    // ============================
    // 📋 ADMIN CRUD
    // ============================

    async create(req, res) {
        try {
            const result = await questionnaireService.create(req.body);
            return result.status
                ? response.success(res, result.message, result.data)
                : response.error(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const result = await questionnaireService.update(id, req.body);
            return result.status
                ? response.success(res, result.message, result.data)
                : response.error(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await questionnaireService.delete(id);
            return result.status
                ? response.success(res, result.message, result.data)
                : response.error(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getAll(req, res) {
        try {
            const { consultationCategoryId } = req.query;
            const result = await questionnaireService.getAll(consultationCategoryId || null);
            return result.status
                ? response.success(res, result.message, result.data)
                : response.error(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    // ============================
    // 👤 CUSTOMER-FACING
    // ============================

    async getQuestionsByCategory(req, res) {
        try {
            const { consultationCategoryId } = req.params;
            const result = await questionnaireService.getQuestionsByCategory(consultationCategoryId);
            return result.status
                ? response.success(res, result.message, result.data)
                : response.error(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async submitAnswers(req, res) {
        try {
            const { roomId } = req.params;
            const { answers } = req.body;
            const result = await questionnaireService.submitAnswers(roomId, answers);
            return result.status
                ? response.success(res, result.message, result.data)
                : response.error(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async saveAnswer(req, res) {
        try {
            const { roomId } = req.params;
            const { questionnaireId, answer } = req.body;
            const result = await questionnaireService.saveAnswer(roomId, questionnaireId, answer);
            return result.status
                ? response.success(res, result.message, result.data)
                : response.error(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getRoomProgress(req, res) {
        try {
            const { roomId } = req.params;
            const result = await questionnaireService.getRoomProgress(roomId);
            return result.status
                ? response.success(res, result.message, result.data)
                : response.error(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getAnswersByRoom(req, res) {
        try {
            const { roomId } = req.params;
            const result = await questionnaireService.getAnswersByRoom(roomId);
            return result.status
                ? response.success(res, result.message, result.data)
                : response.error(res, result.message, result.data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },
};
