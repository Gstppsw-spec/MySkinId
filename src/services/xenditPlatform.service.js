const axios = require("axios");
const { nanoid } = require("nanoid");
const {
    platformTransfer,
    masterLocation,
    sequelize,
} = require("../models");

const XENDIT_BASE_URL = "https://api.xendit.co";

function _getAuthHeader() {
    const secretKey = process.env.XENDIT_SECRET_KEY;
    return Buffer.from(secretKey + ":").toString("base64");
}

module.exports = {
    /**
     * Create an OWNED sub-account on Xendit for a location/outlet.
     * Saves the returned user_id as xenditAccountId on the location record.
     */
    async createSubAccount(location) {
        try {
            if (!location.email) {
                console.warn(`[XenditPlatform] Location ${location.id} has no email, skipping sub-account creation.`);
                return { status: false, message: "Location email is required for Xendit sub-account" };
            }

            const response = await axios.post(
                `${XENDIT_BASE_URL}/v2/accounts`,
                {
                    type: "OWNED",
                    email: location.email,
                    public_profile: {
                        business_name: location.name,
                    },
                },
                {
                    headers: {
                        Authorization: `Basic ${_getAuthHeader()}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const xenditAccountId = response.data.id;

            // Save xenditAccountId to the location record
            await masterLocation.update(
                { xenditAccountId },
                { where: { id: location.id } }
            );

            console.log(`[XenditPlatform] Sub-account created for location ${location.id}: ${xenditAccountId}`);

            return {
                status: true,
                message: "Xendit sub-account created successfully",
                data: { xenditAccountId, rawResponse: response.data },
            };
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error(`[XenditPlatform] Failed to create sub-account for location ${location.id}:`, detail);
            return { status: false, message: `Failed to create Xendit sub-account: ${detail}` };
        }
    },

    /**
     * Transfer funds from platform to merchant sub-account.
     * @param {Object} params
     * @param {string} params.locationId
     * @param {number} params.amount
     * @param {string} params.transferType - "PRODUCT_DELIVERED" or "VOUCHER_REDEEM"
     * @param {string} [params.transactionId]
     * @param {string} [params.transactionItemId]
     * @param {string} params.orderId
     */
    async transferToMerchant({ locationId, amount, transferType, transactionId, transactionItemId, orderId }) {
        const platformUserId = process.env.XENDIT_PLATFORM_USER_ID;

        if (!platformUserId) {
            console.error("[XenditPlatform] XENDIT_PLATFORM_USER_ID is not configured");
            return { status: false, message: "Platform user ID not configured" };
        }

        // Get location and its xenditAccountId
        const location = await masterLocation.findByPk(locationId);
        if (!location) {
            console.error(`[XenditPlatform] Location ${locationId} not found`);
            return { status: false, message: "Location not found" };
        }

        if (!location.xenditAccountId) {
            console.warn(`[XenditPlatform] Location ${locationId} (${location.name}) has no xenditAccountId, skipping transfer.`);
            return { status: false, message: "Location does not have a Xendit sub-account" };
        }

        const reference = `TRF-${nanoid(12).toUpperCase()}`;
        const platformFeePercent = parseFloat(process.env.XENDIT_PLATFORM_FEE_PERCENT || "0");
        const platformFee = Math.round((amount * platformFeePercent) / 100);
        const transferAmount = amount - platformFee;

        if (transferAmount <= 0) {
            console.warn(`[XenditPlatform] Transfer amount is zero or negative for reference ${reference}`);
            return { status: false, message: "Transfer amount must be positive" };
        }

        // Create transfer record as PENDING
        const transferRecord = await platformTransfer.create({
            transactionId,
            transactionItemId,
            orderId,
            locationId,
            xenditAccountId: location.xenditAccountId,
            amount: transferAmount,
            platformFee,
            reference,
            transferType,
            status: "PENDING",
        });

        try {
            const response = await axios.post(
                `${XENDIT_BASE_URL}/transfers`,
                {
                    reference,
                    amount: transferAmount,
                    source_user_id: platformUserId,
                    destination_user_id: location.xenditAccountId,
                },
                {
                    headers: {
                        Authorization: `Basic ${_getAuthHeader()}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            // Update to SUCCESS
            await transferRecord.update({
                status: "SUCCESS",
                xenditTransferId: response.data.transfer_id || response.data.id,
                xenditResponse: response.data,
            });

            console.log(`[XenditPlatform] Transfer SUCCESS: ${reference} → ${location.name} (${transferAmount} IDR)`);

            return {
                status: true,
                message: "Transfer to merchant successful",
                data: transferRecord.toJSON(),
            };
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error(`[XenditPlatform] Transfer FAILED: ${reference}:`, detail);

            await transferRecord.update({
                status: "FAILED",
                errorMessage: detail,
                xenditResponse: error.response ? error.response.data : null,
            });

            return { status: false, message: `Transfer failed: ${detail}` };
        }
    },

    /**
     * Retry a failed transfer.
     */
    async retryFailedTransfer(transferId) {
        const transfer = await platformTransfer.findByPk(transferId);

        if (!transfer) {
            return { status: false, message: "Transfer record not found" };
        }

        if (transfer.status === "SUCCESS") {
            return { status: false, message: "Transfer already succeeded" };
        }

        const platformUserId = process.env.XENDIT_PLATFORM_USER_ID;
        if (!platformUserId) {
            return { status: false, message: "Platform user ID not configured" };
        }

        // Generate a new reference for retry
        const newReference = `TRF-${nanoid(12).toUpperCase()}`;

        try {
            const response = await axios.post(
                `${XENDIT_BASE_URL}/transfers`,
                {
                    reference: newReference,
                    amount: parseFloat(transfer.amount),
                    source_user_id: platformUserId,
                    destination_user_id: transfer.xenditAccountId,
                },
                {
                    headers: {
                        Authorization: `Basic ${_getAuthHeader()}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            await transfer.update({
                status: "SUCCESS",
                reference: newReference,
                xenditTransferId: response.data.transfer_id || response.data.id,
                xenditResponse: response.data,
                errorMessage: null,
                retryCount: transfer.retryCount + 1,
            });

            console.log(`[XenditPlatform] Retry Transfer SUCCESS: ${newReference}`);
            return { status: true, message: "Retry transfer successful", data: transfer.toJSON() };
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error(`[XenditPlatform] Retry Transfer FAILED: ${newReference}:`, detail);

            await transfer.update({
                errorMessage: detail,
                xenditResponse: error.response ? error.response.data : null,
                retryCount: transfer.retryCount + 1,
            });

            return { status: false, message: `Retry failed: ${detail}` };
        }
    },

    /**
     * Get all transfers for a specific order.
     */
    async getTransfersByOrder(orderId) {
        try {
            const transfers = await platformTransfer.findAll({
                where: { orderId },
                include: [
                    {
                        model: masterLocation,
                        as: "location",
                        attributes: ["id", "name", "code"],
                    },
                ],
                order: [["createdAt", "DESC"]],
            });

            return { status: true, message: "Transfers fetched", data: transfers };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },
};
