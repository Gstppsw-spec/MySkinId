require('dotenv').config();
const rajaongkirService = require('./src/services/rajaongkir.service');

async function test() {
    try {
        console.log("Testing with origin: 572, destination: 434, weight: 100");
        const result = await rajaongkirService.calculateAllCosts({
            origin: "572",
            destination: "434",
            weight: 100
        });
        console.log("Result:", JSON.stringify(result, null, 2));

        // Let's also try to fetch details about these IDs if possible
        // Actually the service doesn't have a lookup by ID yet, but we can try to find them in cities or districts
    } catch (error) {
        console.error("Caught error:", error.message);
    }
}

test();
