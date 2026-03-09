const axios = require('axios');
require('dotenv').config();

const api = axios.create({
    baseURL: "https://rajaongkir.komerce.id/api/v1",
    headers: { key: process.env.RAJAONGKIR_API_KEY },
});

async function debugStructure() {
    try {
        console.log("--- DEBUGGING RAJA ONGKIR STRUCTURE ---");

        // Provinces
        const pRes = await api.get("/destination/province");
        if (pRes.data.data && pRes.data.data.length > 0) {
            console.log("Province Keys:", Object.keys(pRes.data.data[0]));
            console.log("Province Sample:", pRes.data.data[0]);

            const pId = pRes.data.data[0].id || pRes.data.data[0].province_id;

            // Cities
            const cRes = await api.get(`/destination/city/${pId}`);
            if (cRes.data.data && cRes.data.data.length > 0) {
                console.log("City Keys:", Object.keys(cRes.data.data[0]));
                console.log("City Sample:", cRes.data.data[0]);

                const cId = cRes.data.data[0].city_id || cRes.data.data[0].id;

                // Districts
                const dRes = await api.get(`/destination/district/${cId}`);
                if (dRes.data.data && dRes.data.data.length > 0) {
                    console.log("District Keys:", Object.keys(dRes.data.data[0]));
                    console.log("District Sample:", dRes.data.data[0]);
                }
            }
        }
    } catch (err) {
        console.error("Debug failed:", err.response?.data || err.message);
    }
}

debugStructure();
