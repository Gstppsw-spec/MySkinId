function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryRequest(fn, retries = 10, delay = 5000) {
    try {
        return await fn();
    } catch (err) {
        if (err.response && err.response.status === 429 && retries > 0) {
            let waitTime = delay;
            if (err.response.headers && err.response.headers["retry-after"]) {
                const retryAfter = parseInt(err.response.headers["retry-after"], 10);
                if (!isNaN(retryAfter)) {
                    waitTime = retryAfter * 1000 + 1000; // Convert to ms + buffer
                }
            }
            console.log(`⚠️ 429 detected. Retry in ${waitTime}ms... (${retries} left)`);
            await sleep(waitTime);
            return retryRequest(fn, retries - 1, delay * 2);
        }
        throw err;
    }
}

module.exports = {
    sleep,
    retryRequest,
};
