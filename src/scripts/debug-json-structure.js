const axios = require("axios");
const DATA_URL = "https://raw.githubusercontent.com/pentagonal/Indonesia-Postal-Code/master/Json/postal_province_code_as_key.json";

async function debugData() {
    try {
        const response = await axios.get(DATA_URL);
        const data = response.data;
        const keys = Object.keys(data);
        console.log("Total Province Keys:", keys.length);
        const firstKey = keys[0];
        const items = data[firstKey];
        if (items && items.length > 0) {
            console.log(`First Key (${firstKey}) has ${items.length} items`);
            console.log("First Item keys:", Object.keys(items[0]));
            console.log("First Item sample:", JSON.stringify(items[0], null, 2));
        } else {
            console.log(`First Key (${firstKey}) has NO items`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
debugData();
