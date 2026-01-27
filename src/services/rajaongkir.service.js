const axios = require("axios");

const BASE_URL = "https://rajaongkir.komerce.id/api/v1/destination";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        key: process.env.RAJAONGKIR_API_KEY,
    },
});

// Province
async function fetchProvinces() {
    try {
        const res = await api.get("/province");
        return res.data.data;
    } catch (error) {
        console.error("Error fetching provinces:", error.response ? error.response.data : error.message);
        throw error;
    }
}

// City by Province ID
async function fetchCities(provinceId) {
    try {
        const res = await api.get(`/city/${provinceId}`);
        return res.data.data;
    } catch (error) {
        console.error(`Error fetching cities for province ${provinceId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
}

// District by City ID
async function fetchDistricts(cityId) {
    try {
        const res = await api.get(`/district/${cityId}`);
        return res.data.data;
    } catch (error) {
        console.error(`Error fetching districts for city ${cityId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = {
    fetchProvinces,
    fetchCities,
    fetchDistricts,
};
