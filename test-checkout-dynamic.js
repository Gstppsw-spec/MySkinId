const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_URL = "http://localhost:3000/api/v2";
const SECRET = process.env.JWT_SECRET || "your-secret-key";

async function testCheckout() {
    try {
        // Generate Token
        const token = jwt.sign({ id: 1, email: "test@example.com" }, SECRET);
        const headers = { Authorization: `Bearer ${token}` };

        console.log("--- 1. Get Dynamic Payment Methods ---");
        const methodsRes = await axios.get(`${API_URL}/transaction/order/payment-methods`, { headers });
        console.log("Groups found:", methodsRes.data.data.map(g => g.type));

        // Pick a VA and an E-Wallet from the first available ones
        const vaMethod = methodsRes.data.data.find(g => g.type === "VIRTUAL_ACCOUNT")?.channels[0];
        const ewMethod = methodsRes.data.data.find(g => g.type === "EWALLET")?.channels[0];
        const qrMethod = methodsRes.data.data.find(g => g.type === "QR_CODE")?.channels[0];

        if (vaMethod) {
            console.log(`Using VA: ${vaMethod.code}`);
            console.log("\n--- 2. Direct Checkout with VA ---");
            const checkoutVA = await axios.post(`${API_URL}/transaction/order/checkout-direct`, {
                items: [
                    { type: "product", id: 1, qty: 1 }
                ],
                paymentMethod: vaMethod.code
            }, { headers });
            console.log("Checkout VA Success:", checkoutVA.data.data.paymentDetails.bankCode, checkoutVA.data.data.paymentDetails.accountNumber);
        }

        if (ewMethod) {
            console.log(`Using EW: ${ewMethod.code}`);
            console.log("\n--- 3. Direct Checkout with E-Wallet ---");
            const checkoutEW = await axios.post(`${API_URL}/transaction/order/checkout-direct`, {
                items: [
                    { type: "product", id: 1, qty: 1 }
                ],
                paymentMethod: ewMethod.code
            }, { headers });
            console.log("Checkout EW Success:", checkoutEW.data.data.paymentDetails.channelCode, checkoutEW.data.data.paymentDetails.checkoutUrl);
        }

        if (qrMethod) {
            console.log(`Using QR: ${qrMethod.code}`);
            console.log("\n--- 4. Direct Checkout with QRIS ---");
            const checkoutQR = await axios.post(`${API_URL}/transaction/order/checkout-direct`, {
                items: [
                    { type: "product", id: 1, qty: 1 }
                ],
                paymentMethod: qrMethod.code
            }, { headers });
            console.log("Checkout QR Success:", checkoutQR.data.data.paymentDetails.paymentType, "QR String length:", checkoutQR.data.data.paymentDetails.qrString.length);
        }

    } catch (error) {
        console.error("Test Failed:", error.response ? error.response.data : error.message);
    }
}

testCheckout();
