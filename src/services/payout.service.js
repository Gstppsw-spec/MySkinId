const axios = require("axios");
const { nanoid } = require("nanoid");

const XENDIT_BASE_URL = "https://api.xendit.co";

function _getAuthHeader() {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  return Buffer.from(secretKey + ":").toString("base64");
}

module.exports = {
  /**
   * Send money to a bank account using Xendit Disbursement
   */
  async createDisbursement({
    amount,
    bankCode,
    accountHolderName,
    accountNumber,
    description,
    externalId
  }) {
    try {
      const reference = externalId || `WD-${nanoid(12).toUpperCase()}`;

      const response = await axios.post(
        `${XENDIT_BASE_URL}/disbursements`,
        {
          external_id: reference,
          amount: parseFloat(amount),
          bank_code: bankCode,
          account_holder_name: accountHolderName,
          account_number: accountNumber,
          description: description || "Withdrawal from MySkinId"
        },
        {
          headers: {
            Authorization: `Basic ${_getAuthHeader()}`,
            "Content-Type": "application/json"
          }
        }
      );

      return {
        status: true,
        message: "Disbursement created successfully",
        data: response.data
      };
    } catch (error) {
      const detail = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error("[XenditPayout] Failed to create disbursement:", detail);
      return {
        status: false,
        message: `Xendit Payout failed: ${detail}`,
        raw: error.response ? error.response.data : null
      };
    }
  }
};
