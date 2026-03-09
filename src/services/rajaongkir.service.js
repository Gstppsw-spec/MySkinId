const axios = require("axios");

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        key: process.env.RAJAONGKIR_API_KEY,
    },
});

// Province
async function fetchProvinces() {
    try {
        const res = await api.get("/destination/province");
        return res.data.data;
    } catch (error) {
        console.error("Error fetching provinces:", error.response ? error.response.data : error.message);
        throw error;
    }
}

// City by Province ID
async function fetchCities(provinceId) {
    try {
        const res = await api.get(`/destination/city/${provinceId}`);
        return res.data.data;
    } catch (error) {
        console.error(`Error fetching cities for province ${provinceId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
}

// District by City ID
async function fetchDistricts(cityId) {
    try {
        const res = await api.get(`/destination/district/${cityId}`);
        return res.data.data;
    } catch (error) {
        console.error(`Error fetching districts for city ${cityId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
}

// Shipping Cost Calculation
async function calculateCost(data) {
    try {
        const origin = parseInt(data.origin);
        const destination = parseInt(data.destination);
        const weight = parseInt(data.weight);
        const courier = data.courier ? data.courier.toLowerCase() : "";

        const params = new URLSearchParams();
        params.append("origin", origin);
        params.append("destination", destination);
        params.append("weight", weight);
        params.append("courier", courier);

        const res = await api.post("/calculate/domestic-cost", params, {
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            }
        });

        const rawData = res.data.data;
        // Normalize data: ensure each service has a 'cost' array with a 'value' property
        if (Array.isArray(rawData)) {
            return rawData.map(service => {
                if (typeof service.cost === "number") {
                    service.cost = [{ value: service.cost }];
                } else if (service.cost && typeof service.cost === "object" && !Array.isArray(service.cost)) {
                    service.cost = [service.cost];
                }
                return service;
            });
        }

        return rawData;
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.meta?.message || error.message);
    }
}

// Available Couriers
async function fetchCouriers() {
    return [
        { code: "jne", name: "JNE" },
        { code: "sicepat", name: "SiCepat" },
        { code: "jnt", name: "J&T Express" },
        { code: "tiki", name: "TIKI" },
        { code: "pos", name: "POS Indonesia" },
        { code: "wahana", name: "Wahana" },
        { code: "ninja", name: "Ninja Express" },
        { code: "lion", name: "Lion Parcel" },
        { code: "ide", name: "IDExpress" },
        { code: "sap", name: "SAP Express" },
        { code: "sentral", name: "Sentral Cargo" },
        { code: "rex", name: "Royal Express Asia" },
    ];
}

async function calculateAllCosts(data) {
    const couriers = await fetchCouriers();
    const promises = couriers.map(async (courier) => {
        try {
            const result = await calculateCost({
                ...data,
                courier: courier.code
            });
            return {
                courierCode: courier.code,
                courierName: courier.name,
                costs: result,
                status: "success"
            };
        } catch (error) {
            return {
                courierCode: courier.code,
                courierName: courier.name,
                message: error.message,
                status: "error"
            };
        }
    });

    const results = await Promise.all(promises);
    return results.filter((res) => res.status === "success");
}

async function trackWaybill(awb, courier) {
    try {
        const params = new URLSearchParams();
        params.append("awb", awb);
        params.append("courier", courier.toLowerCase());

        const res = await api.post("/track/waybill", params, {
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            }
        });

        return res.data;
    } catch (error) {
        console.error("Tracking Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.meta?.message || "Failed to fetch tracking info");
    }
}

// Sub-District by District ID
async function fetchSubDistricts(districtId) {
    try {
        const res = await api.get(`/destination/sub-district/${districtId}`);
        return res.data.data;
    } catch (error) {
        console.error(`Error fetching sub-districts for district ${districtId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = {
    fetchProvinces,
    fetchCities,
    fetchDistricts,
    fetchSubDistricts,
    calculateCost,
    calculateAllCosts,
    fetchCouriers,
    trackWaybill,
};
