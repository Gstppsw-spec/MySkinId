const axios = require("axios");
require('dotenv').config();

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";
const api = axios.create({
    baseURL: BASE_URL,
    headers: { key: process.env.RAJAONGKIR_API_KEY },
});

async function testRajaOngkir() {
    try {
        console.log("Testing Raja Ongkir (Komerce) API...");

        // Test cities
        const cityId = 152; // Jakarta Pusat
        const distRes = await api.get(`/destination/district/${cityId}`);
        console.log("Districts (Kecamatan) for City 152:", distRes.data.data.slice(0, 2));

        // Try a guess for sub-districts (Kelurahan)
        const distId = distRes.data.data[0].subdistrict_id;
        try {
            const subRes = await api.get(`/destination/subdistrict/${distId}`);
            console.log("Sub-Districts (Kelurahan) for District ID:", distId, subRes.data);
        } catch (e) {
            console.log("Sub-District endpoint failed as expected:", e.message);
        }
    } catch (error) {
        console.error("Test Error:", error.response?.data || error.message);
    }
}

testRajaOngkir();
