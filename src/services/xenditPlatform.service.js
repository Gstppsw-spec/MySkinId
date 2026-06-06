const axios = require("axios");
const { nanoid } = require("nanoid");
const {
    platformTransfer,
    masterLocation,
    order,
    orderPayment,
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
    async transferToMerchant({ locationId, amount, transferType, transactionId, transactionItemId, orderId, executeImmediately = false }) {
        const platformUserId = process.env.XENDIT_PLATFORM_USER_ID;

        if (!platformUserId) {
            console.error("[XenditPlatform] XENDIT_PLATFORM_USER_ID is not configured");
            return { status: false, message: "Platform user ID not configured" };
        }

        // Get location and its company to check registration date
        const location = await masterLocation.findByPk(locationId, {
            include: [{ model: require("../models").masterCompany, as: "company" }]
        });
        if (!location) {
            console.error(`[XenditPlatform] Location ${locationId} not found`);
            return { status: false, message: "Location not found" };
        }

        // Removed Xendit sub-account check as per new requirement (using local DB balance instead)
        /*
        if (!location.xenditAccountId) {
            console.warn(`[XenditPlatform] Location ${locationId} (${location.name}) has no xenditAccountId, skipping transfer.`);
            return { status: false, message: "Location does not have a Xendit sub-account" };
        }
        */

        const reference = `TRF-${nanoid(12).toUpperCase()}`;
        // Calculate Fees (Individual company fee, or fallback to 4% for partners registered May 2026 onwards, 1% for older)
        const cutoffDate = new Date("2026-05-01T00:00:00Z");
        const companyCreatedAt = location.company?.createdAt;
        const companyPlatformFee = location.company?.platformFee;
        let platformFeePercent = parseFloat(process.env.XENDIT_PLATFORM_FEE_PERCENT || "1");
        
        if (companyPlatformFee !== null && companyPlatformFee !== undefined) {
            platformFeePercent = parseFloat(companyPlatformFee);
        } else if (companyCreatedAt && new Date(companyCreatedAt) >= cutoffDate) {
            platformFeePercent = 4;
        }
        
        const platformFee = Math.round((amount * platformFeePercent) / 100);

        // Fetch actual MDR fee from orderPayment to deduct proportionally and check for voucher usage
        let mdrShare = 0;
        let itemVoucherDiscount = 0;
        try {
            const { VoucherUsage, transactionItem, transaction } = require("../models");
            const [orderData, paymentData, voucherUsage] = await Promise.all([
                order.findByPk(orderId),
                orderPayment.findOne({ where: { orderId, paymentStatus: "SUCCESS" } }),
                VoucherUsage.findOne({ where: { orderId } })
            ]);

            if (orderData && paymentData && paymentData.mdrFee > 0) {
                // Formula: (This Amount / Total Order Amount) * Total MDR Fee
                const totalAmount = parseFloat(orderData.totalAmount);
                const totalMdr = parseFloat(paymentData.mdrFee);
                mdrShare = Math.round((amount / totalAmount) * totalMdr);
                console.log(`[XenditPlatform] Calculated proportional MDR for ${reference}: ${mdrShare} (from total ${totalMdr})`);
            }

            if (voucherUsage && parseFloat(voucherUsage.discountAmount) > 0) {
                // Find all transaction items under this order to compute the proportion
                const allItems = await transactionItem.findAll({
                    include: [
                        {
                            model: transaction,
                            as: "transaction",
                            where: { orderId }
                        }
                    ]
                });

                const totalOrderAmountBeforeDiscount = allItems.reduce(
                    (sum, item) => sum + parseFloat(item.totalPrice || 0),
                    0
                );

                if (totalOrderAmountBeforeDiscount > 0) {
                    const proportion = amount / totalOrderAmountBeforeDiscount;
                    itemVoucherDiscount = Math.round(proportion * parseFloat(voucherUsage.discountAmount));
                    console.log(`[XenditPlatform] Calculated proportional voucher discount for ${reference}: ${itemVoucherDiscount} (proportion: ${proportion})`);
                }
            }
        } catch (feeErr) {
            console.error(`[XenditPlatform] Error calculating proportional MDR or voucher discount:`, feeErr.message);
        }

        const transferAmount = amount - itemVoucherDiscount - platformFee - mdrShare;

        if (transferAmount <= 0) {
            console.warn(`[XenditPlatform] Transfer amount is zero or negative for reference ${reference}`);
            return { status: false, message: "Transfer amount must be positive" };
        }

        // Create transfer record as PENDING_SETTLEMENT
        const transferRecord = await platformTransfer.create({
            transactionId,
            transactionItemId,
            orderId,
            locationId,
            xenditAccountId: location.xenditAccountId || "LOCAL_BALANCE",
            amount: transferAmount,
            platformFee,
            mdrFee: mdrShare,
            reference,
            transferType,
            status: "PENDING_SETTLEMENT",
        });

        if (!executeImmediately) {
            console.log(`[XenditPlatform] Transfer recorded as PENDING_SETTLEMENT for reference ${reference}`);
            return {
                status: true,
                message: "Transfer recorded as PENDING_SETTLEMENT",
                data: transferRecord.toJSON(),
            };
        }

        try {
            // Instead of Xendit API, add to local DB balance
            const balanceService = require("./balance.service");
            const balanceResult = await balanceService.addBalance(
                location.companyId,
                transferAmount,
                transferType || "ITEM_DELIVERED",
                orderId,
                `Payout for ${transferType} (Ref: ${reference})`
            );

            if (!balanceResult.status) {
                throw new Error(`Failed to add balance: ${balanceResult.message}`);
            }

            // Update to SUCCESS
            await transferRecord.update({
                status: "SUCCESS",
                xenditTransferId: `LOCAL-${reference}`,
                xenditResponse: { message: "Transferred to local DB balance" },
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

    async executePendingTransfer(transferId) {
        const t = await sequelize.transaction();
        try {
            const transfer = await platformTransfer.findByPk(transferId, {
                transaction: t,
                lock: true,
            });

            if (!transfer) {
                await t.rollback();
                return { status: false, message: "Transfer record not found" };
            }

            if (transfer.status !== "PENDING_SETTLEMENT") {
                await t.rollback();
                return { status: false, message: "Transfer is not in PENDING_SETTLEMENT status" };
            }

            const platformUserId = process.env.XENDIT_PLATFORM_USER_ID;
            if (!platformUserId) {
                await t.rollback();
                return { status: false, message: "Platform user ID not configured" };
            }

            // Fetch companyId from location
            const { masterLocation } = require("../models");
            const location = await masterLocation.findByPk(transfer.locationId, {
                transaction: t,
            });
            if (!location) {
                throw new Error(`Location ${transfer.locationId} not found`);
            }

            // Instead of Xendit API, add to local DB balance
            const balanceService = require("./balance.service");
            const balanceResult = await balanceService.addBalance(
                location.companyId,
                parseFloat(transfer.amount),
                transfer.transferType || "ITEM_DELIVERED",
                transfer.orderId,
                `Settlement for ${transfer.transferType} (Ref: ${transfer.reference})`,
                t
            );

            if (!balanceResult.status) {
                throw new Error(`Failed to add balance: ${balanceResult.message}`);
            }

            await transfer.update({
                status: "SUCCESS",
                xenditTransferId: `LOCAL-${transfer.reference}`,
                xenditResponse: { message: "Transferred to local DB balance via Cron" },
            }, { transaction: t });

            await t.commit();
            console.log(`[XenditPlatform] Pending Transfer SUCCESS: ${transfer.reference}`);
            return { status: true, message: "Transfer successful (Added to DB Balance)", data: transfer.toJSON() };
        } catch (error) {
            if (t) {
                try {
                    await t.rollback();
                } catch (rollbackErr) {
                    console.error("Rollback failed in executePendingTransfer:", rollbackErr.message);
                }
            }
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error(`[XenditPlatform] Pending Transfer FAILED: ${transferId}:`, detail);

            try {
                const transferToUpdate = await platformTransfer.findByPk(transferId);
                if (transferToUpdate) {
                    await transferToUpdate.update({
                        status: "FAILED",
                        errorMessage: detail,
                        xenditResponse: error.response ? error.response.data : null,
                    });
                }
            } catch (updateErr) {
                console.error("Failed to update status to FAILED:", updateErr.message);
            }

            return { status: false, message: `Transfer failed: ${detail}` };
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

    /**
     * Fetch actual transaction details from Xendit to get current fee (MDR).
     * @param {string} reference - The externalId/orderNumber
     */
    async getTransactionDetail(reference) {
        try {
            const response = await axios.get(
                `${XENDIT_BASE_URL}/transactions?reference_id=${reference}`,
                {
                    headers: {
                        Authorization: `Basic ${_getAuthHeader()}`,
                    },
                }
            );

            // Xendit returns an array of transactions for this reference
            const transactions = response.data.data;
            if (transactions && transactions.length > 0) {
                // Find the latest successful payment transaction
                const latest = transactions.find(t => t.status === "SUCCESS" && t.type === "PAYMENT") || transactions[0];
                return { status: true, data: latest };
            }

            return { status: false, message: "No transaction found on Xendit for this reference" };
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            return { status: false, message: `Failed to fetch Xendit transaction: ${detail}` };
        }
    },

    /**
     * Get available disbursement banks from Xendit
     */
    async getAvailableDisbursementBanks() {
        try {
            const response = await axios.get(
                `${XENDIT_BASE_URL}/available_disbursements_banks`,
                {
                    headers: {
                        Authorization: `Basic ${_getAuthHeader()}`,
                    },
                }
            );

            // Filter to only include actual banks, excluding e-wallets
            const excludedCodes = ["DANA", "GOPAY", "LINKAJA", "OVO", "SHOPEEPAY"];
            const filteredBanks = response.data.filter(
                bank => !excludedCodes.includes(bank.code.toUpperCase())
            );

            return { status: true, data: filteredBanks };
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            return { status: false, message: `Failed to fetch available disbursement banks: ${detail}` };
        }
    },
};
