const axios = require('axios');
const jwt = require('jsonwebtoken'); // Assuming this exists in project
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api/v2';

async function runTests() {
    // Let's get the master customer from the database to ensure we have an id
    let customerId;
    let token;

    try {
        const { masterCustomer } = require('./src/models');
        const customer = await masterCustomer.findOne({ where: { loginMethod: 'email' } });
        if (!customer) {
            console.log("No customer found to test with.");
            return;
        }
        customerId = customer.id;
        console.log("Testing with customer ID:", customerId);

        // create token
        token = jwt.sign(
            {
                id: customer.id,
                email: customer.email,
                loginMethod: customer.loginMethod,
            },
            process.env.JWT_SECRET || 'your_secret_key', // use default if no env
            { expiresIn: "1y" }
        );
        console.log("Generated Token:", token.substring(0, 20) + '...');
    } catch (err) {
        console.error("Failed to generate token", err);
        return;
    }

    const headers = {
        Authorization: `Bearer ${token}`
    };

    let addressId = null;

    try {
        console.log("\n--- 1. Create Address ---");
        const createRes = await axios.post(`${BASE_URL}/customer/address`, {
            label: "Kantor",
            receiverName: "Udin Pengetes",
            receiverPhone: "081234567890",
            address: "Jl. Sudirman No 1",
            province: "DKI Jakarta",
            city: "Jakarta Pusat",
            district: "Tanah Abang",
            cityId: 152, // Jakarta Pusat ID
            postalCode: "10220"
        }, { headers });

        addressId = createRes.data.data.id;
        console.log("Address created:", createRes.data);

        console.log("\n--- 2. Get All Addresses ---");
        const getRes = await axios.get(`${BASE_URL}/customer/address`, { headers });
        console.log("Addresses list:", getRes.data.data.length, "items");

        console.log("\n--- 3. Get Address By ID ---");
        const getByIdRes = await axios.get(`${BASE_URL}/customer/address/${addressId}`, { headers });
        console.log("Address detail:", getByIdRes.data.data.id);

        console.log("\n--- 4. Set Primary Address ---");
        const setPrimaryRes = await axios.put(`${BASE_URL}/customer/address/${addressId}/primary`, {}, { headers });
        console.log("Set primary result:", setPrimaryRes.data);

        console.log("\n--- 5. Update Address ---");
        const updateRes = await axios.put(`${BASE_URL}/customer/address/${addressId}`, {
            label: "Rumah Baru"
        }, { headers });
        console.log("Update result:", updateRes.data.data.label);

        console.log("\n--- 6. Delete Address ---");
        const deleteRes = await axios.delete(`${BASE_URL}/customer/address/${addressId}`, { headers });
        console.log("Delete result:", deleteRes.data);

    } catch (error) {
        console.error("Test failed at some step:", error.response?.data || error.message);
    }
}

runTests();
