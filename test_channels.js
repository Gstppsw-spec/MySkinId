const axios = require('axios');
require('dotenv').config();

async function check() {
    const authHeader = Buffer.from(process.env.XENDIT_SECRET_KEY + ":").toString("base64");
    try {
        console.log("Fetching VA...");
        const va = await axios.get("https://api.xendit.co/available_virtual_account_banks", {
            headers: { Authorization: `Basic ${authHeader}` }
        });
        console.log("VA:", va.data);
    } catch (e) {
        console.error(e.response?.data || e.message);
    }

    try {
        console.log("Fetching EWALLET...");
        const ew = await axios.get("https://api.xendit.co/ewallets/channels", {
            headers: { Authorization: `Basic ${authHeader}` }
        });
        console.log("EWALLET:", ew.data);
    } catch (e) {
        console.error(e.response?.data || e.message);
    }
}
check();
