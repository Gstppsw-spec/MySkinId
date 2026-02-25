const socketInstance = require("../socket/socketInstance");

// In-memory map to track active payment timers: orderId -> timeoutId
const paymentTimers = new Map();

const PAYMENT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Schedules auto-expiry of an order after PAYMENT_TIMEOUT_MS if still UNPAID.
 * @param {string} orderId
 * @param {string} orderNumber
 * @param {Function} expireCallback - async fn(orderId, orderNumber) that handles DB updates
 */
function schedulePaymentTimeout(orderId, orderNumber, expireCallback) {
    // Cancel any existing timer for this order (e.g., re-checkout)
    cancelPaymentTimeout(orderId);

    const timerId = setTimeout(async () => {
        paymentTimers.delete(orderId);
        try {
            await expireCallback(orderId, orderNumber);
        } catch (err) {
            console.error(`[PaymentTimeout] Error expiring order ${orderNumber}:`, err.message);
        }
    }, PAYMENT_TIMEOUT_MS);

    paymentTimers.set(orderId, timerId);
    console.log(`[PaymentTimeout] Scheduled expiry for order ${orderNumber} in 10 minutes`);
}

/**
 * Cancels a scheduled payment timeout (e.g., order was already paid or cancelled)
 */
function cancelPaymentTimeout(orderId) {
    if (paymentTimers.has(orderId)) {
        clearTimeout(paymentTimers.get(orderId));
        paymentTimers.delete(orderId);
    }
}

module.exports = { schedulePaymentTimeout, cancelPaymentTimeout, PAYMENT_TIMEOUT_MS };
