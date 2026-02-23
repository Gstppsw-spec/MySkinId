const rajaongkirService = require('./src/services/rajaongkir.service');
require('dotenv').config();

async function test() {
    try {
        const rates = await rajaongkirService.calculateCost({
            origin: 329,
            destination: 152,
            weight: 1000,
            courier: 'jne'
        });
        console.log("RajaOngkir Result:", JSON.stringify(rates, null, 2));
    } catch (error) {
        console.error("Test Error:", error.message);
    }
}

test();
