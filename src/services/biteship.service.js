const axios = require("axios");

const BASE_URL = "https://api.biteship.com/v1";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        Authorization: `Bearer ${process.env.BITESHIP_API_KEY}`,
        "Content-Type": "application/json",
    },
});

/**
 * Search areas (provinces, cities, districts) by keyword
 * Replaces: fetchProvinces, fetchCities, fetchDistricts
 * @param {string} keyword - Search keyword (e.g. "Jakarta", "Bandung")
 * @param {string} [countries="ID"] - Country code
 * @returns {Promise<Array>} List of matching areas
 */
async function searchArea(keyword, countries = "ID") {
    try {
        const res = await api.get("/maps/areas", {
            params: { countries, input: keyword, type: "single" },
        });
        return res.data.areas || [];
    } catch (error) {
        console.error("Biteship searchArea Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
}

/**
 * Get list of available couriers from Biteship
 * Replaces: fetchCouriers (hardcoded list)
 * @returns {Promise<Array>} List of couriers with their services
 */
async function getCouriers() {
    try {
        const res = await api.get("/couriers");
        return res.data.couriers || [];
    } catch (error) {
        console.error("Biteship getCouriers Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
}

const INSTANT_COURIERS = ["gojek", "grab", "maxim", "lalamove", "borzo", "deliveree"];

async function fetchRatesFromBiteship(data, couriersStr, locationPriority) {
    const payload = {};

    // Determine Origin
    if (locationPriority === "coordinates" && data.origin_latitude && data.origin_longitude) {
        payload.origin_latitude = data.origin_latitude;
        payload.origin_longitude = data.origin_longitude;
    } else if (data.origin_area_id) {
        payload.origin_area_id = data.origin_area_id;
    } else if (data.origin_latitude && data.origin_longitude) {
        payload.origin_latitude = data.origin_latitude;
        payload.origin_longitude = data.origin_longitude;
    } else if (data.origin_postal_code) {
        payload.origin_postal_code = parseInt(data.origin_postal_code);
    }

    // Determine Destination
    if (locationPriority === "coordinates" && data.destination_latitude && data.destination_longitude) {
        payload.destination_latitude = data.destination_latitude;
        payload.destination_longitude = data.destination_longitude;
    } else if (data.destination_area_id) {
        payload.destination_area_id = data.destination_area_id;
    } else if (data.destination_latitude && data.destination_longitude) {
        payload.destination_latitude = data.destination_latitude;
        payload.destination_longitude = data.destination_longitude;
    } else if (data.destination_postal_code) {
        payload.destination_postal_code = parseInt(data.destination_postal_code);
    }

    // Items
    payload.items = (data.items || []).map(item => ({
        name: item.name || "Item",
        value: item.value || 0,
        weight: item.weight || 0,
        quantity: item.quantity || 1,
        ...(item.length && { length: item.length }),
        ...(item.width && { width: item.width }),
        ...(item.height && { height: item.height }),
    }));

    if (couriersStr) {
        payload.couriers = couriersStr;
    }

    const res = await api.post("/rates/couriers", payload);
    return res.data;
}

/**
 * Calculate shipping rates
 * Replaces: calculateCost
 * 
 * Supports 3 modes for origin/destination:
 *   1. Coordinates: origin_latitude + origin_longitude
 *   2. Postal code: origin_postal_code
 *   3. Area ID: origin_area_id (Biteship area ID string)
 *
 * Note: If both area_id and coordinates are provided and mixed couriers are requested, 
 * it smartly splits the request to ensure instant couriers get coordinates.
 * 
 * @param {Object} data
 * @param {string} [data.origin_area_id]
 * @param {number} [data.origin_latitude]
 * @param {number} [data.origin_longitude]
 * @param {string} [data.origin_postal_code]
 * @param {string} [data.destination_area_id]
 * @param {number} [data.destination_latitude]
 * @param {number} [data.destination_longitude]
 * @param {string} [data.destination_postal_code]
 * @param {Array} data.items - Array of { name, value, weight, quantity }
 * @param {string} [data.couriers] - Comma-separated courier codes (e.g. "jne,sicepat")
 * @returns {Promise<Object>} Pricing data with available services
 */
async function getRates(data) {
    try {
        const couriers = data.couriers ? data.couriers.split(",").map(c => c.trim().toLowerCase()) : [];
        
        let standardCouriers = [];
        let instantCouriers = [];

        if (couriers.length > 0) {
            standardCouriers = couriers.filter(c => !INSTANT_COURIERS.includes(c));
            instantCouriers = couriers.filter(c => INSTANT_COURIERS.includes(c));
        }

        const hasOriginArea = !!data.origin_area_id;
        const hasOriginCoords = !!(data.origin_latitude && data.origin_longitude);
        const hasDestArea = !!data.destination_area_id;
        const hasDestCoords = !!(data.destination_latitude && data.destination_longitude);

        const needsSplit = instantCouriers.length > 0 && standardCouriers.length > 0 && 
            ((hasOriginArea && hasOriginCoords) || (hasDestArea && hasDestCoords));

        if (needsSplit) {
            const [standardRes, instantRes] = await Promise.allSettled([
                fetchRatesFromBiteship(data, standardCouriers.join(","), "area"),
                fetchRatesFromBiteship(data, instantCouriers.join(","), "coordinates")
            ]);

            const mergedPricing = [];
            let origin = null;
            let destination = null;

            if (standardRes.status === "fulfilled" && standardRes.value.pricing) {
                mergedPricing.push(...standardRes.value.pricing);
                origin = standardRes.value.origin;
                destination = standardRes.value.destination;
            } else if (standardRes.status === "rejected") {
                console.warn("Biteship standard couriers fetch failed:", standardRes.reason?.response?.data || standardRes.reason?.message);
            }

            if (instantRes.status === "fulfilled" && instantRes.value.pricing) {
                mergedPricing.push(...instantRes.value.pricing);
                if (!origin) origin = instantRes.value.origin;
                if (!destination) destination = instantRes.value.destination;
            } else if (instantRes.status === "rejected") {
                 console.warn("Biteship instant couriers fetch failed:", instantRes.reason?.response?.data || instantRes.reason?.message);
            }

            if (standardRes.status === "rejected" && instantRes.status === "rejected") {
                throw standardRes.reason;
            }

            return {
                success: true,
                message: "Courier pricing fetched successfully",
                object: "pricing",
                origin: origin,
                destination: destination,
                pricing: mergedPricing
            };
        } else if (instantCouriers.length > 0 && standardCouriers.length === 0 && couriers.length > 0) {
            return await fetchRatesFromBiteship(data, instantCouriers.join(","), "coordinates");
        } else {
            return await fetchRatesFromBiteship(data, data.couriers, "area");
        }
    } catch (error) {
        console.error("Biteship getRates Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
}

/**
 * Get rates from all available couriers
 * Replaces: calculateAllCosts
 * @param {Object} data - Same as getRates
 * @returns {Promise<Object>} Pricing data from all couriers
 */
async function getAllRates(data) {
    try {
        // Biteship /v1/rates/couriers REQUIRES the 'couriers' parameter.
        // If not provided by user, we use a comprehensive list of popular couriers.
        const couriers = data.couriers || "jne,sicepat,jnt,tiki,anteraja,pos,lion,ninja,ide,shopee,gojek,grab";
        return await getRates({ ...data, couriers });
    } catch (error) {
        console.error("Biteship getAllRates Error:", error.message);
        throw error;
    }
}

/**
 * Track a shipment by waybill ID and courier code
 * Replaces: trackWaybill
 * @param {string} waybillId - The tracking/waybill number
 * @param {string} courierCode - The courier code (e.g. "jne", "sicepat")
 * @returns {Promise<Object>} Tracking data with status and history
 */
async function trackShipment(waybillId, courierCode) {
    try {
        const res = await api.get(`/trackings/${waybillId}/couriers/${courierCode.toLowerCase()}`);
        return res.data;
    } catch (error) {
        console.error("Biteship trackShipment Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "Failed to fetch tracking info");
    }
}

/**
 * Resolve area ID from postal code
 * Utility for auto-populating biteshipAreaId in models
 * @param {string} postalCode
 * @returns {Promise<string|null>}
 */
async function resolveAreaId(postalCode) {
    if (!postalCode) return null;
    try {
        const areas = await searchArea(postalCode);
        // Take the first exact match for postal code if available
        const exactMatch = areas.find(a => String(a.postal_code) === String(postalCode));
        return exactMatch ? exactMatch.id : (areas[0] ? areas[0].id : null);
    } catch (error) {
        console.error("Biteship resolveAreaId Error:", error.message);
        return null;
    }
}

/**
 * Get specific area by detailed names (Village, District, City)
 * Used to resolve ambiguity when broad search doesn't show village names
 * @param {string} village 
 * @param {string} district 
 * @param {string} city 
 * @param {string} postalCode (optional) - Used for precise disambiguation
 * @returns {Promise<Object|null>}
 */
async function getAreaByDetails(village, district, city, postalCode = null) {
    try {
        // Search using combined string for maximum precision
        const keyword = `${village}, ${district}, ${city}`;
        const areas = await searchArea(keyword);

        if (!areas || areas.length === 0) return null;

        // 1. Try to find match using postal code (highest precision)
        if (postalCode) {
            const postalMatch = areas.find(a => String(a.postal_code) === String(postalCode));
            if (postalMatch) return postalMatch;
        }

        // 2. Try to find match that contains the village/district name in its full name
        const match = areas.find(a =>
            a.name.toLowerCase().includes(village.toLowerCase()) &&
            a.name.toLowerCase().includes(district.toLowerCase())
        );

        return match || (areas[0] || null);
    } catch (error) {
        console.error("Biteship getAreaByDetails Error:", error.message);
        return null;
    }
}

/**
 * Create a shipping order (Book courier)
 * Replaces: Manual entry of tracking numbers
 * @param {Object} data 
 * @returns {Promise<Object>} Created order details
 */
async function createOrder(data) {
    try {
        const payload = {
            shipper_contact_name: data.shipper_contact_name || "MySkinId",
            shipper_contact_phone: data.shipper_contact_phone || "08123456789",
            shipper_contact_email: data.shipper_contact_email || "admin@myskinid.com",
            shipper_organization: data.shipper_organization || "MySkinId",

            origin_contact_name: data.origin_contact_name,
            origin_contact_phone: data.origin_contact_phone,
            origin_address: data.origin_address,
            origin_note: data.origin_note || "",
            // Support both area_id and coordinates for origin
            ...(data.origin_area_id ? { origin_area_id: data.origin_area_id } : {}),
            ...(data.origin_latitude ? { origin_latitude: data.origin_latitude } : {}),
            ...(data.origin_longitude ? { origin_longitude: data.origin_longitude } : {}),

            destination_contact_name: data.destination_contact_name,
            destination_contact_phone: data.destination_contact_phone,
            destination_contact_email: data.destination_contact_email || "",
            destination_address: data.destination_address,
            destination_note: data.destination_note || "",
            // Support both area_id and coordinates for destination
            ...(data.destination_area_id ? { destination_area_id: data.destination_area_id } : {}),
            ...(data.destination_latitude ? { destination_latitude: data.destination_latitude } : {}),
            ...(data.destination_longitude ? { destination_longitude: data.destination_longitude } : {}),

            courier_company: data.courier_company,
            courier_type: data.courier_type,
            delivery_type: data.delivery_type || "now",

            items: (data.items || []).map(item => ({
                name: item.name,
                description: item.description || item.name,
                value: item.value || 0,
                weight: item.weight || 0,
                quantity: item.quantity || 1
            }))
        };

        const res = await api.post("/orders", payload);
        return res.data;
    } catch (error) {
        console.error("Biteship createOrder Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
}

/**
 * Get order detail from Biteship
 * Used to retrieve order data for shipping label generation
 * @param {string} orderId - Biteship order ID
 * @returns {Promise<Object>} Order detail data
 */
async function getOrderDetail(orderId) {
    try {
        const res = await api.get(`/orders/${orderId}`);
        return res.data;
    } catch (error) {
        console.error("Biteship getOrderDetail Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "Failed to fetch order detail from Biteship");
    }
}

module.exports = {
    searchArea,
    getCouriers,
    getRates,
    getAllRates,
    trackShipment,
    resolveAreaId,
    getAreaByDetails,
    createOrder,
    getOrderDetail,
};
