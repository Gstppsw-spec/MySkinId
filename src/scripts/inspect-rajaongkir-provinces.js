const { fetchProvinces } = require("../services/rajaongkir.service");
require('dotenv').config();

async function inspectProvinces() {
    try {
        const provinces = await fetchProvinces();
        console.log("Full Province Data (First 2):");
        console.log(JSON.stringify(provinces.slice(0, 2), null, 2));
    } catch (error) {
        console.error("Error:", error.message);
    }
}

inspectProvinces();
