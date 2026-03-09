const axios = require("axios");
require('dotenv').config();

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";
const api = axios.create({
    baseURL: BASE_URL,
    headers: { key: process.env.RAJAONGKIR_API_KEY },
});

async function testSubDistrict() {
    try {
        console.log("Testing Raja Ongkir Sub-District Endpoint...");
        // User's example ID: 1327
        const res = await api.get("/destination/sub-district/1327");
        console.log("Data for Sub-District 1327:", JSON.stringify(res.data.data, null, 2));
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

testSubDistrict();
