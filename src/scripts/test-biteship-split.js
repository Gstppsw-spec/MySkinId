require('dotenv').config();
const biteshipService = require('../services/biteship.service');

async function test() {
    try {
        console.log("Searching for a valid area to use as origin/destination...");
        const areas = await biteshipService.searchArea("Jakarta");
        if (!areas || areas.length === 0) {
            console.log("No areas found. Cannot test.");
            return;
        }
        
        const validArea = areas[0];
        console.log(`Using Area: ${validArea.name} (ID: ${validArea.id}, Coords: ${validArea.latitude}, ${validArea.longitude})`);

        const payload = {
            origin_area_id: validArea.id,
            origin_latitude: validArea.latitude, // Biteship usually has lat/lon in area data? Or maybe not. Let's provide manually just in case
            origin_longitude: validArea.longitude,
            destination_area_id: validArea.id,
            destination_latitude: validArea.latitude + 0.01, // slightly different
            destination_longitude: validArea.longitude + 0.01,
            items: [
                {
                    name: "Serum ABC",
                    value: 150000,
                    weight: 200,
                    quantity: 1
                }
            ]
        };

        // If biteship search doesn't return lat/long, we use defaults
        if (!payload.origin_latitude) {
            payload.origin_latitude = -6.2243;
            payload.origin_longitude = 106.8406;
            payload.destination_latitude = -6.2285;
            payload.destination_longitude = 106.8335;
        }

        console.log("Fetching all rates...");
        const res = await biteshipService.getAllRates(payload);
        console.log("Success!");
        if (res && res.pricing) {
            const couriers = [...new Set(res.pricing.map(p => p.company))];
            console.log("Couriers returned:", couriers);
        } else {
            console.log(res);
        }
    } catch(err) {
        console.error("Test Error:", err.message);
    }
}
test();
