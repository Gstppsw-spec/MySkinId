const rajaongkirService = require("../services/rajaongkir.service");
const response = require("../helpers/response");

module.exports = {
    async getProvinces(req, res) {
        try {
            const data = await rajaongkirService.fetchProvinces();
            return response.success(res, "Provinces fetched successfully", data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getCities(req, res) {
        try {
            const { provinceId } = req.params;
            const data = await rajaongkirService.fetchCities(provinceId);
            return response.success(res, "Cities fetched successfully", data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getDistricts(req, res) {
        try {
            const { cityId } = req.params;
            const data = await rajaongkirService.fetchDistricts(cityId);
            return response.success(res, "Districts fetched successfully", data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async calculateShippingCost(req, res) {
        try {
            const result = await rajaongkirService.calculateCost(req.body);
            return response.success(res, "Shipping cost calculated successfully", result);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async getCouriers(req, res) {
        try {
            const data = await rajaongkirService.fetchCouriers();
            return response.success(res, "Couriers fetched successfully", data);
        } catch (error) {
            return response.serverError(res, error);
        }
    },

    async checkAllCourierCosts(req, res) {
        try {
            const result = await rajaongkirService.calculateAllCosts(req.body);
            return response.success(res, "All courier costs fetched successfully", result);
        } catch (error) {
            return response.serverError(res, error);
        }
    },
};
