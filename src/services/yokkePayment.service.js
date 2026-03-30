const axios = require('axios');
const crypto = require('crypto');

let cachedToken = null;
let tokenExpiryTime = null;

function getYokkeConfig() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        baseUrl: isProd 
            ? 'https://api.yokke.co.id:7778' 
            : 'https://tst.yokke.co.id:7778',
        consumerKey: process.env.YOKKE_CONSUMER_KEY,
        consumerSecret: process.env.YOKKE_CONSUMER_SECRET,
        apiKey: process.env.YOKKE_API_KEY,
        secretKey: process.env.YOKKE_SECRET_KEY,
        merchantId: process.env.YOKKE_MERCHANT_ID,
        webhookSecret: process.env.YOKKE_WEBHOOK_SECRET,
    };
}

async function getAccessToken() {
    const config = getYokkeConfig();
    
    // Check if token is still valid (add 60s safety margin)
    if (cachedToken && tokenExpiryTime && new Date() < tokenExpiryTime) {
        return cachedToken;
    }

    if (!config.consumerKey || !config.consumerSecret) {
        throw new Error('Yokke Consumer Key or Secret is not configured.');
    }

    const authString = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');

    try {
        const response = await axios.post(`${config.baseUrl}/gateway/IPGAPI/v1/token`, 
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const data = response.data;
        cachedToken = data.access_token;
        
        // Cache token with safety margin of 60 seconds
        const expiresIn = data.expires_in || 3600; 
        tokenExpiryTime = new Date(new Date().getTime() + (expiresIn - 60) * 1000);

        return cachedToken;
    } catch (error) {
        console.error('Failed to get Yokke access token:', error.response ? JSON.stringify(error.response.data) : error.message);
        throw new Error(`Failed to get Yokke access token: ${error.message}`);
    }
}

async function createInquiry({ orderNumber, amount, customer, items, referenceUrl, paymentSource }) {
    const config = getYokkeConfig();
    const token = await getAccessToken();

    const requestBody = {
        amount: Math.round(amount),
        currency: 'IDR',
        referenceUrl: referenceUrl || (process.env.FRONTEND_URL || 'https://myskin.id'),
        order: {
            id: orderNumber,
            items: items.map(item => ({
                name: (item.name || 'Unknown Item').substring(0, 30), // Max 30 chars
                quantity: item.quantity,
                amount: Math.round(item.amount)
            }))
        },
        customer: {
            name: (customer.name || 'Customer').substring(0, 50),
            email: (customer.email || 'customer@myskin.id').substring(0, 99),
            phoneNumber: (customer.phone || '0800000000').substring(0, 15),
            country: 'IDN',
            postalCode: (customer.postalCode || '10000').substring(0, 10)
        }
    };

    if (paymentSource) {
        requestBody.paymentSource = paymentSource;
    }

    try {
        const response = await axios.post(`${config.baseUrl}/gateway/IPGAPI/v1/inquiries`, [requestBody], {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-api-key': config.apiKey,
                'Content-Type': 'application/json'
            }
        });

        const responseData = response.data;
        const data = Array.isArray(responseData) ? responseData[0] : responseData;
        
        if (!data || !data.inquiry) {
            console.error('Unexpected Yokke Response:', JSON.stringify(responseData));
            throw new Error('Invalid response format from Yokke. Inquiry data missing.');
        }

        return {
            id: data.inquiry.id,
            checkoutUrl: data.checkoutUrl,
            paymentSources: data.paymentSources,
            rawPayload: data
        };
    } catch (error) {
        console.error('Failed to create Yokke payment:', error.response ? JSON.stringify(error.response.data) : error.message);
        throw new Error(`Failed to create Yokke payment: ${error.message}`);
    }
}

/**
 * Validates the HMAC SHA256 signature from Yokke webhook
 */
function verifyWebhookSignature(rawBody, signature, timestamp) {
    const config = getYokkeConfig();
    if (!config.secretKey) {
        console.warn('Yokke secretKey not configured, skipping signature verification');
        return true;
    }

    try {
        // According to spec: HMAC SHA256(Requested raw body + `.` + timestamp, merchant.SECRETKEY).digest('hex')
        const payloadToSign = `${rawBody}.${timestamp}`;
        const calculatedSignature = crypto
            .createHmac('sha256', config.secretKey)
            .update(payloadToSign)
            .digest('hex');

        return calculatedSignature === signature;
    } catch (error) {
        console.error('Signature verification error:', error.message);
        return false;
    }
}

/**
 * Generates MD5 signature for Yokke webhook response
 */
function generateValidateSignature(signature, timestamp) {
    const config = getYokkeConfig();
    if (!config.secretKey) {
        return '';
    }

    // According to spec: MD5(merchantSECRETKEY + signature + timestamp).digest('hex')
    try {
        const md5sum = crypto.createHash('md5');
        md5sum.update(config.secretKey + signature + timestamp);
        return md5sum.digest('hex');
    } catch (error) {
        console.error('Response signature generation error:', error.message);
        return '';
    }
}

/**
 * Gets transaction status manually (failsafe)
 */
async function getTransactionStatus(inquiryId) {
    const config = getYokkeConfig();
    const token = await getAccessToken();

    try {
        const response = await axios.get(`${config.baseUrl}/gateway/IPGAPI/v1/inquiries/${inquiryId}/transactions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-api-key': config.apiKey
            }
        });

        return response.data;
    } catch (error) {
        console.error('Failed to get Yokke transaction status:', error.response ? JSON.stringify(error.response.data) : error.message);
        throw new Error(`Failed to get Yokke transaction status: ${error.message}`);
    }
}

module.exports = {
    getYokkeConfig,
    getAccessToken,
    createInquiry,
    verifyWebhookSignature,
    generateValidateSignature,
    getTransactionStatus
};
