const biteshipService = require("../services/biteship.service");
const response = require("../helpers/response");

module.exports = {
    /**
     * Search areas by keyword
     * Replaces: getProvinces, getCities, getDistricts (3 endpoints → 1)
     * GET /api/v2/shipping/areas?keyword=xxx
     */
    async searchArea(req, res) {
        try {
            const { keyword } = req.query;
            if (!keyword) {
                return response.badRequest(res, "Keyword is required");
            }
            const data = await biteshipService.searchArea(keyword);
            return response.success(res, "Areas fetched successfully", data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    /**
     * Get available couriers
     * GET /api/v2/shipping/couriers
     */
    async getCouriers(req, res) {
        try {
            const data = await biteshipService.getCouriers();
            return response.success(res, "Couriers fetched successfully", data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    /**
     * Calculate shipping rates for specific courier(s)
     * POST /api/v2/shipping/rates
     */
    async calculateShippingRates(req, res) {
        try {
            const result = await biteshipService.getRates(req.body);
            return response.success(res, "Shipping rates calculated successfully", result);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    /**
     * Calculate shipping rates for all couriers
     * POST /api/v2/shipping/rates/all
     */
    async checkAllCourierRates(req, res) {
        try {
            const result = await biteshipService.getAllRates(req.body);
            return response.success(res, "All courier rates fetched successfully", result);
        } catch (error) {
            return response.serverError(res, error);
        }
    },
};
